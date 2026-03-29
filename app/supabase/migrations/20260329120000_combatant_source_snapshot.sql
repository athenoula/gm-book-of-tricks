-- Add source_snapshot JSONB column to combatants table
-- Stores full source data (monster stat block, NPC details, PC sheet) at add-time
-- for the combatant info popover feature
ALTER TABLE combatants ADD COLUMN source_snapshot JSONB DEFAULT NULL;
