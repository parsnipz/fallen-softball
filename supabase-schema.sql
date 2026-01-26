-- Fallen Softball Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Managers table (for authentication reference)
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  jersey_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('M', 'F')),
  uniform_number INTEGER,
  jersey_size TEXT,
  jersey_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('coed', 'mens')),
  location TEXT,
  date DATE NOT NULL,
  total_cost DECIMAL(10,2),
  venmo_link TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament invitations table
CREATE TABLE tournament_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in', 'out')),
  paid BOOLEAN DEFAULT FALSE,
  signature_token UUID DEFAULT uuid_generate_v4(),
  signature_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_invitations_updated_at
  BEFORE UPDATE ON tournament_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (managers)
-- Managers can read their own record
CREATE POLICY "Managers can view own record" ON managers
  FOR SELECT USING (auth.uid() = id);

-- Authenticated users can CRUD players
CREATE POLICY "Authenticated users can view players" ON players
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert players" ON players
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update players" ON players
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete players" ON players
  FOR DELETE TO authenticated USING (true);

-- Authenticated users can CRUD tournaments
CREATE POLICY "Authenticated users can view tournaments" ON tournaments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tournaments" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tournaments" ON tournaments
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete tournaments" ON tournaments
  FOR DELETE TO authenticated USING (true);

-- Authenticated users can CRUD tournament_invitations
CREATE POLICY "Authenticated users can view invitations" ON tournament_invitations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert invitations" ON tournament_invitations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invitations" ON tournament_invitations
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete invitations" ON tournament_invitations
  FOR DELETE TO authenticated USING (true);

-- Authenticated users can CRUD documents
CREATE POLICY "Authenticated users can view documents" ON documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert documents" ON documents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update documents" ON documents
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete documents" ON documents
  FOR DELETE TO authenticated USING (true);

-- Create storage bucket for documents (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policy for documents bucket (run after creating bucket)
-- CREATE POLICY "Authenticated users can upload documents" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
-- CREATE POLICY "Anyone can view documents" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents');
