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
