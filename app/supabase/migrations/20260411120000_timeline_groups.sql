-- Timeline Groups
create table timeline_groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null default 'Group',
  sort_order integer not null default 0,
  is_collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_timeline_groups_session on timeline_groups(session_id);
alter table timeline_groups enable row level security;
create policy "GMs can manage timeline groups" on timeline_groups for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
create trigger set_updated_at before update on timeline_groups
  for each row execute function update_updated_at();

-- Add group_id to timeline_blocks
alter table timeline_blocks add column group_id uuid references timeline_groups(id) on delete set null;
create index idx_timeline_blocks_group on timeline_blocks(group_id);

-- Add is_collapsed to scenes
alter table scenes add column is_collapsed boolean not null default false;
