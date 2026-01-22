-- Migration script for existing databases
-- Run this if you already have the tables created

-- Add address and jersey_size to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS jersey_size TEXT;

-- Add location, total_cost, and venmo_link to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS venmo_link TEXT;
