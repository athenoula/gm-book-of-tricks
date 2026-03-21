-- =============================================
-- GM Book of Tricks v2 — Content Library
-- =============================================

-- Player Characters (system-aware)
create table player_characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,

  -- Identity
  name text not null,
  race text,
  class text,
  subclass text,
  level integer not null default 1,
  background text,
  alignment text,

  -- Ability scores (flexible JSONB for system-awareness)
  ability_scores jsonb not null default '{"strength":10,"dexterity":10,"constitution":10,"intelligence":10,"wisdom":10,"charisma":10}',

  -- Proficiencies
  saving_throw_proficiencies text[] default '{}',
  skill_proficiencies text[] default '{}',
  skill_expertises text[] default '{}',

  -- Combat
  hp_current integer not null default 10,
  hp_max integer not null default 10,
  hp_temp integer not null default 0,
  armor_class integer not null default 10,
  speed integer not null default 30,
  initiative_bonus integer not null default 0,
  proficiency_bonus integer not null default 2,
  hit_dice_total text,
  hit_dice_remaining integer,

  -- Spellcasting
  spellcasting_ability text,
  spell_slots jsonb,
  spell_slots_used jsonb,

  -- Equipment & features
  equipment jsonb default '[]',
  class_features jsonb default '[]',
  traits jsonb default '[]',

  -- Roleplay
  personality_traits text,
  ideals text,
  bonds text,
  flaws text,
  backstory text,
  appearance text,
  notes text,

  -- Player info (linked to profiles for future)
  player_name text,
  player_email text,
  player_discord text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pcs_campaign on player_characters(campaign_id);
alter table player_characters enable row level security;
create policy "GMs can manage PCs" on player_characters for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on player_characters
  for each row execute function update_updated_at();

-- NPCs
create table npcs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  race text,
  occupation text,
  personality text,
  appearance text,
  stats jsonb default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_npcs_campaign on npcs(campaign_id);
alter table npcs enable row level security;
create policy "GMs can manage NPCs" on npcs for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on npcs
  for each row execute function update_updated_at();

-- Monsters
create table monsters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  source text not null default 'srd',
  srd_slug text,
  name text not null,
  size text,
  type text,
  alignment text,
  challenge_rating text,
  armor_class integer not null default 10,
  armor_desc text,
  hit_points integer not null default 1,
  hit_dice text,
  speed jsonb default '{"walk": 30}',
  stat_block jsonb default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_monsters_campaign on monsters(campaign_id);
alter table monsters enable row level security;
create policy "GMs can manage monsters" on monsters for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on monsters
  for each row execute function update_updated_at();

-- Spells
create table spells (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  source text not null default 'srd',
  srd_slug text,
  name text not null,
  level integer not null default 0,
  school text,
  casting_time text,
  range text,
  duration text,
  concentration boolean default false,
  ritual boolean default false,
  components text,
  classes text[] default '{}',
  spell_data jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_spells_campaign on spells(campaign_id);
alter table spells enable row level security;
create policy "GMs can manage spells" on spells for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on spells
  for each row execute function update_updated_at();

-- PC spell assignments
create table pc_spells (
  id uuid primary key default gen_random_uuid(),
  pc_id uuid not null references player_characters(id) on delete cascade,
  spell_id uuid not null references spells(id) on delete cascade,
  is_prepared boolean default true,
  created_at timestamptz not null default now(),
  unique(pc_id, spell_id)
);

alter table pc_spells enable row level security;
create policy "GMs can manage PC spells" on pc_spells for all
  using (spell_id in (select s.id from spells s join campaigns c on s.campaign_id = c.id where c.gm_id = auth.uid()))
  with check (spell_id in (select s.id from spells s join campaigns c on s.campaign_id = c.id where c.gm_id = auth.uid()));

-- NPC spell assignments
create table npc_spells (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references npcs(id) on delete cascade,
  spell_id uuid not null references spells(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(npc_id, spell_id)
);

alter table npc_spells enable row level security;
create policy "GMs can manage NPC spells" on npc_spells for all
  using (spell_id in (select s.id from spells s join campaigns c on s.campaign_id = c.id where c.gm_id = auth.uid()))
  with check (spell_id in (select s.id from spells s join campaigns c on s.campaign_id = c.id where c.gm_id = auth.uid()));
