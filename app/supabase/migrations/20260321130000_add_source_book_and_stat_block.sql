-- Add source_book to spells and monsters
ALTER TABLE spells ADD COLUMN IF NOT EXISTS source_book text DEFAULT NULL;
ALTER TABLE monsters ADD COLUMN IF NOT EXISTS source_book text DEFAULT NULL;

-- Add stat_block to npcs (for monster-converted NPCs)
ALTER TABLE npcs ADD COLUMN IF NOT EXISTS stat_block jsonb DEFAULT NULL;
