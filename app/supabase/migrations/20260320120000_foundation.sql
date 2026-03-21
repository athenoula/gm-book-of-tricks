-- =============================================
-- GM Book of Tricks v2 — Foundation Schema
-- =============================================

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  discord text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert with check (id = auth.uid());

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- Campaigns
-- =============================================

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  gm_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  game_system text not null default 'dnd5e-2024',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table campaigns enable row level security;

create policy "GMs can manage their campaigns"
  on campaigns for all
  using (gm_id = auth.uid())
  with check (gm_id = auth.uid());

-- Campaign members (for future player access)
create table campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('gm', 'player', 'spectator')),
  created_at timestamptz not null default now(),
  unique(campaign_id, user_id)
);

alter table campaign_members enable row level security;

create policy "Campaign members can read membership"
  on campaign_members for select
  using (
    campaign_id in (select id from campaigns where gm_id = auth.uid())
    or user_id = auth.uid()
  );

create policy "GMs can manage campaign members"
  on campaign_members for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

-- Auto-add GM as member when campaign is created
create or replace function handle_new_campaign()
returns trigger as $$
begin
  insert into public.campaign_members (campaign_id, user_id, role)
  values (new.id, new.gm_id, 'gm');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_campaign_created
  after insert on campaigns
  for each row execute function handle_new_campaign();

-- =============================================
-- Sessions
-- =============================================

create table sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  session_number integer,
  scheduled_at timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sessions_campaign on sessions(campaign_id);

alter table sessions enable row level security;

create policy "GMs can manage their campaign sessions"
  on sessions for all
  using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
  with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));

-- =============================================
-- Updated_at trigger (reusable)
-- =============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger set_updated_at before update on campaigns
  for each row execute function update_updated_at();

create trigger set_updated_at before update on sessions
  for each row execute function update_updated_at();
