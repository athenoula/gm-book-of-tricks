-- =============================================
-- Beta Feedback & Bug Reporting
-- =============================================

-- Feedback wizard responses (one per user)
create table feedback_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  step1 jsonb,
  step2 jsonb,
  step3 jsonb,
  step4 jsonb,
  current_step integer not null default 1,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table feedback_responses enable row level security;

create policy "Users can manage their own feedback"
  on feedback_responses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_feedback_responses_user on feedback_responses(user_id);

create trigger set_updated_at before update on feedback_responses
  for each row execute function update_updated_at();

-- Bug/idea reports (many per user)
create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug', 'feature', 'feedback')),
  title text not null,
  description text not null,
  severity text check (severity in ('blocking', 'annoying', 'minor')),
  page text,
  screenshot_ids jsonb default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'seen', 'resolved')),
  created_at timestamptz not null default now()
);

alter table bug_reports enable row level security;

create policy "Users can insert their own reports"
  on bug_reports for insert
  with check (user_id = auth.uid());

create policy "Users can read their own reports"
  on bug_reports for select
  using (user_id = auth.uid());

create index idx_bug_reports_user on bug_reports(user_id);
create index idx_bug_reports_type on bug_reports(type);
create index idx_bug_reports_created on bug_reports(created_at desc);
