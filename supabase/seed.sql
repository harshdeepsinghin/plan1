-- Development seed data for testing
-- Run this in Supabase SQL Editor after migrations

-- This file is for local development only
-- In production, users create their own events

-- Sample event for testing (will be created by authenticated users)
-- INSERT INTO events (user_id, title, event_type, event_date, venue, guest_count, budget_total, budget_spent, status)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000', -- replace with actual user ID
--   'Sarah & John\'s Wedding',
--   'wedding',
--   '2025-06-15',
--   'Grand Ballroom, The Plaza Hotel',
--   150,
--   50000,
--   12500,
--   'planning'
-- );

-- Sample budget categories (created automatically via AI)
-- INSERT INTO budget_categories (event_id, name, allocated, spent, sort_order)
-- VALUES 
--   ('event-uuid', 'Venue & Rentals', 15000, 5000, 1),
--   ('event-uuid', 'Catering & Bar', 12000, 3000, 2),
--   ('event-uuid', 'Photography & Video', 5000, 2500, 3),
--   ('event-uuid', 'Decor & Flowers', 4000, 1000, 4),
--   ('event-uuid', 'Attire', 3000, 500, 5),
--   ('event-uuid', 'Music & Entertainment', 2500, 0, 6),
--   ('event-uuid', 'Stationery', 1500, 300, 7),
--   ('event-uuid', 'Transportation', 2000, 200, 8),
--   ('event-uuid', 'Miscellaneous', 5000, 0, 9);

-- Note: Actual seed data is created per-user via the event creation wizard
-- which triggers AI generation of themes, timelines, budgets, and checklists
