-- Items library (campaign-level)
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  type text DEFAULT 'other' CHECK (type IN ('weapon', 'armor', 'magic_item', 'equipment', 'consumable', 'other')),
  rarity text CHECK (rarity IS NULL OR rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),
  cost text,
  stackable boolean DEFAULT false,
  source text DEFAULT 'homebrew' CHECK (source IN ('srd', 'homebrew')),
  srd_slug text,
  item_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_campaign_access" ON items
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_items_campaign ON items(campaign_id);
CREATE INDEX idx_items_name ON items(name);
CREATE UNIQUE INDEX idx_items_srd_slug ON items(campaign_id, srd_slug) WHERE srd_slug IS NOT NULL;
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Character inventory
CREATE TABLE character_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  character_id uuid REFERENCES player_characters(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1,
  notes text,
  equipped boolean DEFAULT false
);

ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_inventory_campaign_access" ON character_inventory
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_character_inventory_character ON character_inventory(character_id);

-- Party treasure
CREATE TABLE party_treasure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE party_treasure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "party_treasure_campaign_access" ON party_treasure
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid()));
CREATE INDEX idx_party_treasure_campaign ON party_treasure(campaign_id);
