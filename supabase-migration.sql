-- Migration script for existing databases
-- Run this if you already have the tables created

-- Add address and jersey_size to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS jersey_size TEXT;

-- Add location to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location TEXT;
