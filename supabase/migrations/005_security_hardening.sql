-- 005: security hardening, pending invitations, event notes, AI rate limiting
--
-- This migration tightens the policies that were exploitable through the
-- public Supabase anon key:
--   * collaborators could promote their own role by updating their row
--   * editors could take ownership of an event by rewriting events.user_id
--   * any signed-in user could read every profile email address
-- It also adds the data the app needs for note-aware prompts, pending invites,
-- and a database-backed AI usage limit.

-- Event notes ---------------------------------------------------------------
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes TEXT;

-- Helper: does the viewer share an event with this profile? -----------------
-- SECURITY DEFINER breaks the profiles -> event_collaborators -> profiles
-- policy recursion and keeps the membership check in one place.
CREATE OR REPLACE FUNCTION public.shares_event_with(p_profile_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id = p_user_id
      OR EXISTS (
        SELECT 1
        FROM events e
        WHERE (e.user_id = p_profile_id
               OR EXISTS (
                 SELECT 1 FROM event_collaborators ec
                 WHERE ec.event_id = e.id
                   AND ec.user_id = p_profile_id
               ))
          AND public.can_access_event(e.id, p_user_id)
      );
$$;

REVOKE ALL ON FUNCTION public.shares_event_with(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shares_event_with(UUID, UUID) TO authenticated;

-- Profile privacy -----------------------------------------------------------
-- Names and avatars remain visible to people who share an event. The raw
-- profile table is no longer a directory of every planner's email address.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view shared profiles" ON profiles;
CREATE POLICY "Users can view shared profiles" ON profiles
  FOR SELECT TO authenticated
  USING (public.shares_event_with(id, auth.uid()));

-- Invite lookup -------------------------------------------------------------
-- An owner needs to turn an email into a profile id without being able to list
-- the profiles table. This function returns one exact match and nothing else.
CREATE OR REPLACE FUNCTION public.find_profile_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.full_name, p.avatar_url
  FROM profiles p
  WHERE auth.uid() IS NOT NULL
    AND lower(p.email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_profile_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(TEXT) TO authenticated;

-- Pending invitations -------------------------------------------------------
-- Invitees can see what they were invited to without gaining access to the
-- event's child rows until they accept.
CREATE OR REPLACE FUNCTION public.get_pending_invites()
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  event_date DATE,
  role TEXT,
  invited_at TIMESTAMPTZ,
  inviter_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ec.event_id,
    e.title,
    e.event_date,
    ec.role,
    ec.invited_at,
    COALESCE(op.full_name, op.email, 'A planner')
  FROM event_collaborators ec
  JOIN events e ON e.id = ec.event_id
  LEFT JOIN profiles op ON op.id = e.user_id
  WHERE ec.user_id = auth.uid()
    AND ec.accepted_at IS NULL
  ORDER BY ec.invited_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_pending_invites() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_invites() TO authenticated;

-- Event ownership -----------------------------------------------------------
-- Editors may change content (budget, guests, tasks, milestones) but never the
-- event row itself. This stops an editor from rewriting user_id and taking the
-- event, and keeps settings owner-only as the README promises.
DROP POLICY IF EXISTS "Users can update accessible events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
CREATE POLICY "Users can update own events" ON events
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Collaborator visibility and escalation ------------------------------------
DROP POLICY IF EXISTS "Users can view relevant collaborators" ON event_collaborators;
CREATE POLICY "Users can view relevant collaborators" ON event_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.can_access_event(event_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.protect_collaborator_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role and migration contexts are allowed to change rows.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_event_owner(OLD.event_id, auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Invitees may only stamp accepted_at on their own invitation.
  IF NEW.event_id IS DISTINCT FROM OLD.event_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.invited_at IS DISTINCT FROM OLD.invited_at THEN
    RAISE EXCEPTION 'Only the event owner can change collaborator details';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_collaborator_update ON event_collaborators;
CREATE TRIGGER protect_collaborator_update
  BEFORE UPDATE ON event_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.protect_collaborator_update();

-- Theme writes for editors ---------------------------------------------------
-- Editors cannot update the events row directly, but generating a theme is an
-- editorial action. This narrow function lets them set just that column.
CREATE OR REPLACE FUNCTION public.set_event_theme(p_event_id UUID, p_theme JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to update this theme';
  END IF;

  UPDATE events SET ai_generated_theme = p_theme WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_theme(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_event_theme(UUID, JSONB) TO authenticated;

-- Atomic budget recalculation ------------------------------------------------ Replaces the N+1 loop in the server action. Only owners and editors may run
-- it, and it derives every value from the database rather than trusting input.
CREATE OR REPLACE FUNCTION public.refresh_event_budget_spent(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_edit_event(p_event_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to recalculate this budget';
  END IF;

  UPDATE budget_categories bc
  SET spent = COALESCE((
    SELECT SUM(COALESCE(bi.actual_cost, 0))
    FROM budget_items bi
    WHERE bi.category_id = bc.id
      AND bi.status <> 'cancelled'
  ), 0)
  WHERE bc.event_id = p_event_id;

  UPDATE events e
  SET budget_spent = COALESCE((
    SELECT SUM(bc.spent)
    FROM budget_categories bc
    WHERE bc.event_id = p_event_id
  ), 0)
  WHERE e.id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_event_budget_spent(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_event_budget_spent(UUID) TO authenticated;

-- AI usage ledger -----------------------------------------------------------
-- Every Gemini call is logged so server actions can enforce per-user limits.
-- Users may insert and read their own rows, but never delete them, so a client
-- cannot reset its own rate limit.
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own AI requests" ON ai_requests;
CREATE POLICY "Users can read own AI requests" ON ai_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can log own AI requests" ON ai_requests;
CREATE POLICY "Users can log own AI requests" ON ai_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (event_id IS NULL OR public.can_access_event(event_id, auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created
  ON ai_requests(user_id, created_at DESC);

-- Extra indexes used by dashboard and invite queries.
CREATE INDEX IF NOT EXISTS idx_event_collaborators_user_accepted
  ON event_collaborators(user_id, accepted_at);
CREATE INDEX IF NOT EXISTS idx_ai_ideas_event_created
  ON ai_ideas(event_id, created_at DESC);
