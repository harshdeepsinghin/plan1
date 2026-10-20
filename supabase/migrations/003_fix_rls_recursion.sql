-- 003: fix recursive RLS policies using SECURITY DEFINER helpers.
--
-- The original events policy read event_collaborators, whose policy read events,
-- which Postgres reports as "infinite recursion detected in policy". These
-- helper functions run as the owner and bypass RLS, breaking the cycle while
-- keeping membership checks centralized.

CREATE OR REPLACE FUNCTION public.is_event_owner(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE events.id = p_event_id
      AND events.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_event(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_event_owner(p_event_id, p_user_id)
      OR EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = p_event_id
          AND event_collaborators.user_id = p_user_id
          AND event_collaborators.accepted_at IS NOT NULL
      );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_event(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_event_owner(p_event_id, p_user_id)
      OR EXISTS (
        SELECT 1 FROM event_collaborators
        WHERE event_collaborators.event_id = p_event_id
          AND event_collaborators.user_id = p_user_id
          AND event_collaborators.accepted_at IS NOT NULL
          AND event_collaborators.role IN ('editor')
      );
$$;

CREATE OR REPLACE FUNCTION public.can_access_category(p_category_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM budget_categories
    WHERE budget_categories.id = p_category_id
      AND public.can_access_event(budget_categories.event_id, p_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_category(p_category_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM budget_categories
    WHERE budget_categories.id = p_category_id
      AND public.can_edit_event(budget_categories.event_id, p_user_id)
  );
$$;

-- Events --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;

CREATE POLICY "Users can view accessible events" ON events
  FOR SELECT USING (
    user_id = auth.uid() OR public.can_access_event(id, auth.uid())
  );

CREATE POLICY "Users can update accessible events" ON events
  FOR UPDATE USING (
    user_id = auth.uid() OR public.can_edit_event(id, auth.uid())
  ) WITH CHECK (
    user_id = auth.uid() OR public.can_edit_event(id, auth.uid())
  );

-- Budget categories ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage budget categories for accessible events" ON budget_categories;
CREATE POLICY "Users can view accessible budget categories" ON budget_categories
  FOR SELECT USING (public.can_access_event(event_id, auth.uid()));
CREATE POLICY "Users can modify accessible budget categories" ON budget_categories
  FOR ALL USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));

-- Budget items --------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage budget items for accessible events" ON budget_items;
CREATE POLICY "Users can view accessible budget items" ON budget_items
  FOR SELECT USING (public.can_access_category(category_id, auth.uid()));
CREATE POLICY "Users can modify accessible budget items" ON budget_items
  FOR ALL USING (public.can_edit_category(category_id, auth.uid()))
  WITH CHECK (public.can_edit_category(category_id, auth.uid()));

-- Milestones ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage milestones for accessible events" ON milestones;
CREATE POLICY "Users can view accessible milestones" ON milestones
  FOR SELECT USING (public.can_access_event(event_id, auth.uid()));
CREATE POLICY "Users can modify accessible milestones" ON milestones
  FOR ALL USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));

-- Vendors -------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage vendors for accessible events" ON vendors;
CREATE POLICY "Users can view accessible vendors" ON vendors
  FOR SELECT USING (public.can_access_event(event_id, auth.uid()));
CREATE POLICY "Users can modify accessible vendors" ON vendors
  FOR ALL USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));

-- Guests --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage guests for accessible events" ON guests;
CREATE POLICY "Users can view accessible guests" ON guests
  FOR SELECT USING (public.can_access_event(event_id, auth.uid()));
CREATE POLICY "Users can modify accessible guests" ON guests
  FOR ALL USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));

-- Tasks ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage tasks for accessible events" ON tasks;
CREATE POLICY "Users can view accessible tasks" ON tasks
  FOR SELECT USING (public.can_access_event(event_id, auth.uid()));
CREATE POLICY "Users can modify accessible tasks" ON tasks
  FOR ALL USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));

-- AI ideas ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view AI ideas for accessible events" ON ai_ideas;
DROP POLICY IF EXISTS "Users can insert AI ideas for editable events" ON ai_ideas;
CREATE POLICY "Users can view accessible AI ideas" ON ai_ideas
  FOR SELECT USING (public.can_access_event(event_id, auth.uid()));
CREATE POLICY "Users can manage AI ideas for editable events" ON ai_ideas
  FOR ALL USING (public.can_edit_event(event_id, auth.uid()))
  WITH CHECK (public.can_edit_event(event_id, auth.uid()));

-- Collaborators -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view collaborators for own events" ON event_collaborators;
DROP POLICY IF EXISTS "Event owners can manage collaborators" ON event_collaborators;
DROP POLICY IF EXISTS "Event owners can add collaborators" ON event_collaborators;
DROP POLICY IF EXISTS "Collaborators can accept invitations" ON event_collaborators;

CREATE POLICY "Users can view relevant collaborators" ON event_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_event_owner(event_id, auth.uid())
  );

CREATE POLICY "Event owners can add collaborators" ON event_collaborators
  FOR INSERT WITH CHECK (public.is_event_owner(event_id, auth.uid()));

CREATE POLICY "Owners and invitees can update collaborators" ON event_collaborators
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_event_owner(event_id, auth.uid())
  ) WITH CHECK (
    user_id = auth.uid() OR public.is_event_owner(event_id, auth.uid())
  );

CREATE POLICY "Owners and collaborators can remove collaborators" ON event_collaborators
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_event_owner(event_id, auth.uid())
  );
