-- Abilities table
CREATE TABLE abilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  usage_type text DEFAULT 'other' CHECK (usage_type IN ('action', 'bonus_action', 'reaction', 'passive', 'other')),
  source text DEFAULT 'homebrew' CHECK (source IN ('srd', 'homebrew')),
  srd_slug text,
  ability_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abilities_campaign_access" ON abilities
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE INDEX idx_abilities_campaign ON abilities(campaign_id);
CREATE INDEX idx_abilities_name ON abilities(name);
CREATE UNIQUE INDEX idx_abilities_srd_slug ON abilities(campaign_id, srd_slug) WHERE srd_slug IS NOT NULL;

CREATE TRIGGER update_abilities_updated_at
  BEFORE UPDATE ON abilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Character-Abilities junction table
CREATE TABLE character_abilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ability_id uuid REFERENCES abilities(id) ON DELETE CASCADE NOT NULL,
  character_id uuid REFERENCES player_characters(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  notes text DEFAULT '',
  UNIQUE(ability_id, character_id)
);

ALTER TABLE character_abilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_abilities_campaign_access" ON character_abilities
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE INDEX idx_character_abilities_ability ON character_abilities(ability_id);
CREATE INDEX idx_character_abilities_character ON character_abilities(character_id);
