-- =============================================
-- GM Book of Tricks v2 — Scenes & Timeline
-- =============================================

-- Scenes (session content blocks)
create table scenes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null default 'New Scene',
  content text not null default '',
  sort_order integer not null default 0,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scenes_session_sort on scenes(session_id, sort_order);

alter table scenes enable row level security;

create policy "GMs can manage scenes" on scenes for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

create trigger set_updated_at before update on scenes
  for each row execute function update_updated_at();

-- Timeline blocks (embedded references to campaign content)
create table timeline_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  block_type text not null check (block_type in ('scene', 'note', 'monster', 'npc', 'spell')),
  source_id uuid,
  title text not null default '',
  content_snapshot jsonb default '{}',
  sort_order integer not null default 0,
  is_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_timeline_session_sort on timeline_blocks(session_id, sort_order);

alter table timeline_blocks enable row level security;

create policy "GMs can manage timeline blocks" on timeline_blocks for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

create trigger set_updated_at before update on timeline_blocks
  for each row execute function update_updated_at();
