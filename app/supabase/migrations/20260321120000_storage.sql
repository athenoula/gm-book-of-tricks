-- =============================================
-- Image & PDF Storage
-- =============================================

-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('campaign-pdfs', 'campaign-pdfs', false)
on conflict (id) do nothing;

-- Storage RLS: GM can manage their campaign's images
create policy "Campaign GM can manage images"
on storage.objects for all
using (
  bucket_id = 'campaign-images'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
)
with check (
  bucket_id = 'campaign-images'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
);

-- Storage RLS: GM can manage their campaign's PDFs
create policy "Campaign GM can manage pdfs"
on storage.objects for all
using (
  bucket_id = 'campaign-pdfs'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
)
with check (
  bucket_id = 'campaign-pdfs'
  and (string_to_array(name, '/'))[1] in (
    select id::text from campaigns where gm_id = auth.uid()
  )
);

-- Add portrait/image columns to existing tables
alter table player_characters add column if not exists portrait_url text;
alter table npcs add column if not exists portrait_url text;
alter table locations add column if not exists image_url text;

-- Campaign files table for PDFs and other attachments
create table if not exists campaign_files (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  file_type text not null default 'pdf',
  storage_path text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table campaign_files enable row level security;

create policy "GM can manage campaign files"
on campaign_files for all
using (campaign_id in (select id from campaigns where gm_id = auth.uid()))
with check (campaign_id in (select id from campaigns where gm_id = auth.uid()));
