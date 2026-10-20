-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('wedding', 'birthday', 'community', 'other')),
  event_date DATE NOT NULL,
  venue TEXT,
  guest_count INTEGER DEFAULT 0,
  budget_total DECIMAL(12,2) DEFAULT 0,
  budget_spent DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  ai_generated_theme JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget categories
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocated DECIMAL(12,2) DEFAULT 0,
  spent DECIMAL(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Budget items
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vendor TEXT,
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'booked', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  category TEXT CHECK (category IN ('booking', 'payments', 'design', 'logistics', 'other')),
  priority INTEGER DEFAULT 2 CHECK (priority IN (1,2,3)),
  sort_order INTEGER DEFAULT 0
);

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  quote_amount DECIMAL(12,2),
  status TEXT DEFAULT 'researching' CHECK (status IN ('researching', 'contacted', 'quoted', 'negotiating', 'booked', 'rejected')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);

-- Guests
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  category TEXT,
  plus_one BOOLEAN DEFAULT FALSE,
  plus_one_name TEXT,
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'yes', 'no', 'maybe')),
  dietary_restrictions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  priority INTEGER DEFAULT 2 CHECK (priority IN (1,2,3)),
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Ideas cache
CREATE TABLE ai_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  idea_type TEXT NOT NULL,
  content JSONB NOT NULL,
  prompt_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event collaborators
CREATE TABLE event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can view/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Events: users can access their own events + collaborations
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_collaborators 
      WHERE event_id = events.id 
      AND user_id = auth.uid() 
      AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_collaborators 
      WHERE event_id = events.id 
      AND user_id = auth.uid() 
      AND accepted_at IS NOT NULL
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (user_id = auth.uid());

-- Budget categories
CREATE POLICY "Users can manage budget categories for accessible events" ON budget_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = budget_categories.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Budget items
CREATE POLICY "Users can manage budget items for accessible events" ON budget_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM budget_categories bc
      JOIN events e ON e.id = bc.event_id
      WHERE bc.id = budget_items.category_id
      AND (
        e.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = e.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Milestones
CREATE POLICY "Users can manage milestones for accessible events" ON milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = milestones.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Vendors
CREATE POLICY "Users can manage vendors for accessible events" ON vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = vendors.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Guests
CREATE POLICY "Users can manage guests for accessible events" ON guests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = guests.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Tasks
CREATE POLICY "Users can manage tasks for accessible events" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = tasks.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- AI Ideas
CREATE POLICY "Users can view AI ideas for accessible events" ON ai_ideas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ai_ideas.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
        )
      )
    )
  );

CREATE POLICY "Users can insert AI ideas for editable events" ON ai_ideas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = ai_ideas.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_collaborators 
          WHERE event_id = events.id 
          AND user_id = auth.uid() 
          AND accepted_at IS NOT NULL
          AND role IN ('owner', 'editor')
        )
      )
    )
  );

-- Event collaborators
CREATE POLICY "Users can view collaborators for own events" ON event_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_collaborators.event_id
      AND events.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Event owners can manage collaborators" ON event_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_collaborators.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_budget_categories_event_id ON budget_categories(event_id);
CREATE INDEX idx_budget_items_category_id ON budget_items(category_id);
CREATE INDEX idx_milestones_event_id ON milestones(event_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_vendors_event_id ON vendors(event_id);
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_ai_ideas_event_id ON ai_ideas(event_id);
CREATE INDEX idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX idx_event_collaborators_user_id ON event_collaborators(user_id);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
