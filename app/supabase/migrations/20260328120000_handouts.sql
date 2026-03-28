-- Handouts (campaign-level)
CREATE TABLE handouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template text NOT NULL CHECK (template IN ('scroll', 'wanted', 'decree', 'map_note', 'tavern', 'broadsheet', 'invitation', 'blank')),
  content jsonb NOT NULL DEFAULT '{}',
  style jsonb NOT NULL DEFAULT '{}',
  seal jsonb,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE handouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handouts_campaign_access" ON handouts
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_handouts_campaign ON handouts(campaign_id);
CREATE TRIGGER update_handouts_updated_at BEFORE UPDATE ON handouts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add 'handout' to timeline block_type check constraint
ALTER TABLE timeline_blocks DROP CONSTRAINT IF EXISTS timeline_blocks_block_type_check;
ALTER TABLE timeline_blocks ADD CONSTRAINT timeline_blocks_block_type_check
  CHECK (block_type IN ('scene', 'note', 'monster', 'npc', 'spell', 'location', 'battle', 'handout'));
