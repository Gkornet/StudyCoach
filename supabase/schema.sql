-- StudyCoach — opslag voor herbruikbare lesstof per kind (Supabase / Postgres)
--
-- Voer dit één keer uit in je Supabase-project: Dashboard → SQL Editor → plak → Run.
-- Elk kind is een eigen auth-gebruiker; Row-Level Security zorgt dat een kind
-- UITSLUITEND zijn eigen materialen en bestanden kan zien of wijzigen.

-- ── Profiel: extra gegevens naast auth.users ────────────────────────────────
-- ouder_email leggen we vast met het oog op toestemming (AVG, minderjarigen).
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  naam         text,
  ouder_email  text,
  created_at   timestamptz not null default now()
);

-- ── Materiaal = één hoofdstuk/onderwerp dat een kind heeft geüpload ──────────
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  titel       text not null,
  vak         text,
  created_at  timestamptz not null default now()
);
create index if not exists materials_user_idx on public.materials(user_id, created_at desc);

-- ── De foto's/PDF bij een materiaal; de bytes zelf staan in Storage ──────────
create table if not exists public.material_files (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  soort        text not null check (soort in ('image','pdf')),
  storage_path text not null,
  volgorde     int  not null default 0
);
create index if not exists material_files_material_idx on public.material_files(material_id, volgorde);

-- ── Row-Level Security: alles afgeschermd per gebruiker ──────────────────────
alter table public.profiles       enable row level security;
alter table public.materials      enable row level security;
alter table public.material_files enable row level security;

drop policy if exists "eigen profiel" on public.profiles;
create policy "eigen profiel" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "eigen materialen" on public.materials;
create policy "eigen materialen" on public.materials
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "eigen bestanden" on public.material_files;
create policy "eigen bestanden" on public.material_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Opslag-bucket voor de foto's/PDF (privé) ────────────────────────────────
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

-- Bestanden worden bewaard onder pad  {user_id}/{material_id}/{n}.jpg
-- De eerste map-laag is de user_id, zodat een kind alleen zijn eigen map raakt.
drop policy if exists "eigen map lezen" on storage.objects;
create policy "eigen map lezen" on storage.objects for select
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eigen map schrijven" on storage.objects;
create policy "eigen map schrijven" on storage.objects for insert
  with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eigen map verwijderen" on storage.objects;
create policy "eigen map verwijderen" on storage.objects for delete
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);
