-- Planning preferences shown across the workspace.
-- Amounts are stored as plain numbers; changing currency updates labels only.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'MMM_D_YYYY',
  ADD COLUMN IF NOT EXISTS default_event_type TEXT NOT NULL DEFAULT 'wedding';

COMMENT ON COLUMN profiles.currency IS 'ISO 4217 display currency for budgets and AI prompts.';
COMMENT ON COLUMN profiles.timezone IS 'IANA timezone used when formatting timestamps.';
COMMENT ON COLUMN profiles.date_format IS 'Preferred date display pattern.';
COMMENT ON COLUMN profiles.default_event_type IS 'Default occasion pre-selected when creating an event.';
