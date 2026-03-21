-- =============================================
-- GM Book of Tricks v2 — Generators & Tables
-- =============================================

-- Encounter tables (GM-authored d20 tables)
create table encounter_tables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  environment text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_encounter_tables_campaign on encounter_tables(campaign_id);
alter table encounter_tables enable row level security;
create policy "GMs can manage encounter tables" on encounter_tables for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on encounter_tables
  for each row execute function update_updated_at();

-- Encounter table rows
create table encounter_table_rows (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references encounter_tables(id) on delete cascade,
  d20_min integer not null,
  d20_max integer not null,
  name text not null,
  description text,
  monster_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);

create index idx_encounter_rows_table on encounter_table_rows(table_id);
alter table encounter_table_rows enable row level security;
create policy "GMs can manage encounter rows" on encounter_table_rows for all
  using (table_id in (
    select id from encounter_tables where campaign_id in (
      select id from campaigns where gm_id = auth.uid()
    )
  ))
  with check (table_id in (
    select id from encounter_tables where campaign_id in (
      select id from campaigns where gm_id = auth.uid()
    )
  ));

-- Loot tables
create table loot_tables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_loot_tables_campaign on loot_tables(campaign_id);
alter table loot_tables enable row level security;
create policy "GMs can manage loot tables" on loot_tables for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on loot_tables
  for each row execute function update_updated_at();

-- Loot table items
create table loot_table_items (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references loot_tables(id) on delete cascade,
  d20_min integer not null,
  d20_max integer not null,
  name text not null,
  description text,
  quantity text default '1',
  rarity text,
  created_at timestamptz not null default now()
);

create index idx_loot_items_table on loot_table_items(table_id);
alter table loot_table_items enable row level security;
create policy "GMs can manage loot items" on loot_table_items for all
  using (table_id in (
    select id from loot_tables where campaign_id in (
      select id from campaigns where gm_id = auth.uid()
    )
  ))
  with check (table_id in (
    select id from loot_tables where campaign_id in (
      select id from campaigns where gm_id = auth.uid()
    )
  ));
