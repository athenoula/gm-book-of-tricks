-- =============================================
-- GM Book of Tricks v2 — Initiative & Battles
-- =============================================

-- Combatants (live initiative tracker)
create table combatants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  name text not null,
  initiative integer not null default 0,
  hp_current integer not null default 0,
  hp_max integer not null default 0,
  armor_class integer not null default 10,
  is_player boolean not null default false,
  conditions text[] not null default '{}',
  source_type text check (source_type in ('pc', 'npc', 'monster')),
  source_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_combatants_campaign on combatants(campaign_id);
create index idx_combatants_session on combatants(session_id);

alter table combatants enable row level security;

create policy "GMs can manage combatants in their campaigns"
  on combatants for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

create trigger set_updated_at before update on combatants
  for each row execute function update_updated_at();

-- Enable realtime for combatants
alter publication supabase_realtime add table combatants;

-- Battles (saved encounters)
create table battles (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  type text not null default 'template' check (type in ('template', 'save_state')),
  round integer not null default 0,
  active_index integer not null default 0,
  in_combat boolean not null default false,
  combatant_data jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_battles_campaign on battles(campaign_id);

alter table battles enable row level security;

create policy "GMs can manage battles in their campaigns"
  on battles for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

create trigger set_updated_at before update on battles
  for each row execute function update_updated_at();
