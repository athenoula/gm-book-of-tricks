-- =============================================
-- GM Book of Tricks v2 — Creative Spaces
-- =============================================

-- Inspiration items (global inbox + campaign scratchpad)
create table inspiration_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  title text not null default '',
  content text,
  type text not null default 'text' check (type in ('text', 'image', 'link', 'map')),
  tags text[] default '{}',
  media_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inspiration_user on inspiration_items(user_id);
create index idx_inspiration_campaign on inspiration_items(campaign_id);

alter table inspiration_items enable row level security;

create policy "Users can manage their own inspiration items" on inspiration_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger set_updated_at before update on inspiration_items
  for each row execute function update_updated_at();

-- Locations
create table locations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  description text,
  type text,
  parent_location_id uuid references locations(id) on delete set null,
  map_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_locations_campaign on locations(campaign_id);
create index idx_locations_parent on locations(parent_location_id);

alter table locations enable row level security;

create policy "GMs can manage locations" on locations for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

create trigger set_updated_at before update on locations
  for each row execute function update_updated_at();

-- Location-NPC connections
create table location_npcs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  npc_id uuid not null references npcs(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique(location_id, npc_id)
);

alter table location_npcs enable row level security;

create policy "GMs can manage location NPCs" on location_npcs for all
  using (location_id in (
    select id from locations where campaign_id in (
      select id from campaigns where gm_id = auth.uid()
    )
  ))
  with check (location_id in (
    select id from locations where campaign_id in (
      select id from campaigns where gm_id = auth.uid()
    )
  ));
