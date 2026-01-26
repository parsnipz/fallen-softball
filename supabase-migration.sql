-- Migration script for existing databases
-- Run this if you already have the tables created

-- Add address and jersey_size to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS jersey_size TEXT;

-- Add location, total_cost, and venmo_link to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS venmo_link TEXT;

-- Add paid to tournament_invitations
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;

-- Add signature fields to tournament_invitations
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS signature_token UUID DEFAULT uuid_generate_v4();
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- LODGING FEATURE
-- =============================================

-- Create tournament_lodging table for lodging options
CREATE TABLE IF NOT EXISTS tournament_lodging (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  capacity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add lodging fields to tournament_invitations
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS lodging_status TEXT DEFAULT NULL;
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS lodging_id UUID REFERENCES tournament_lodging(id) ON DELETE SET NULL;
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS lodging_adults INTEGER DEFAULT 1;
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS lodging_kids INTEGER DEFAULT 0;

-- RLS policies for tournament_lodging
ALTER TABLE tournament_lodging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view lodging" ON tournament_lodging;
CREATE POLICY "Authenticated users can view lodging" ON tournament_lodging
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert lodging" ON tournament_lodging;
CREATE POLICY "Authenticated users can insert lodging" ON tournament_lodging
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update lodging" ON tournament_lodging;
CREATE POLICY "Authenticated users can update lodging" ON tournament_lodging
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete lodging" ON tournament_lodging;
CREATE POLICY "Authenticated users can delete lodging" ON tournament_lodging
  FOR DELETE TO authenticated USING (true);

-- RLS policies for public signature access (allows players to sign without logging in)
-- These policies are additive to existing authenticated-only policies

-- Allow anonymous users to view invitation details (for signature page)
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON tournament_invitations;
CREATE POLICY "Anyone can view invitation by token" ON tournament_invitations
  FOR SELECT TO anon USING (true);

-- Allow anonymous users to update signature fields
DROP POLICY IF EXISTS "Anyone can update signature by token" ON tournament_invitations;
CREATE POLICY "Anyone can update signature by token" ON tournament_invitations
  FOR UPDATE TO anon USING (true)
  WITH CHECK (true);

-- Allow public read access to tournaments (for signature page to show tournament details)
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT TO anon USING (true);

-- Allow public read access to players (for signature page to show player name)
DROP POLICY IF EXISTS "Anyone can view players" ON players;
CREATE POLICY "Anyone can view players" ON players
  FOR SELECT TO anon USING (true);

-- Storage policy for signatures (run this in Supabase dashboard if needed)
-- Allow anyone to upload to the signatures folder in documents bucket
-- CREATE POLICY "Anyone can upload signatures" ON storage.objects
--   FOR INSERT TO anon WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'signatures');
-- CREATE POLICY "Anyone can view signatures" ON storage.objects
--   FOR SELECT TO anon USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'signatures');

-- =============================================
-- LODGING PAYMENT FEATURE
-- =============================================

-- Add payment fields to tournament_lodging
ALTER TABLE tournament_lodging ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);
ALTER TABLE tournament_lodging ADD COLUMN IF NOT EXISTS venmo_link TEXT;

-- Add lodging_paid to tournament_invitations
ALTER TABLE tournament_invitations ADD COLUMN IF NOT EXISTS lodging_paid BOOLEAN DEFAULT FALSE;

-- =============================================
-- CUSTOM WAIVER DOCUMENT FEATURE
-- =============================================

-- Add is_waiver field to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_waiver BOOLEAN DEFAULT FALSE;

-- Allow anonymous users to view documents (for signature page to show waiver)
DROP POLICY IF EXISTS "Anyone can view documents" ON documents;
CREATE POLICY "Anyone can view documents" ON documents
  FOR SELECT TO anon USING (true);
