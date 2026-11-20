-- Mon sport : schéma, règles d'accès et temps réel.
-- À exécuter dans Supabase > SQL Editor, sur un projet dédié à l'app.
--
-- Principe d'accès : chaque ligne appartient à un utilisateur (owner_id) et n'est visible que par lui.
-- owner_id prend par défaut l'utilisateur connecté ; l'app l'envoie quand même explicitement.

-- ---------------------------------------------------------------- Séances
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  sport text not null check (sport in ('course', 'velo', 'home-trainer', 'natation', 'ppg')),
  kind text,
  title text,
  distance integer check (distance >= 0),          -- mètres
  duration integer check (duration >= 0),          -- secondes
  elevation integer,
  rpe smallint check (rpe between 1 and 10),
  notes text,
  blocks jsonb,                                    -- blocs structurés (fractionné)
  ppg jsonb,                                       -- exercices d'une séance de PPG
  program_id uuid,
  favorite boolean not null default false,
  milestone text,
  source text not null default 'manuel' check (source in ('manuel', 'polar', 'garmin', 'coros', 'strava')),
  external_id text,
  created_at timestamptz not null default now()
);
create index sessions_owner_date on public.sessions (owner_id, date);
-- Un import depuis une montre ne crée jamais deux fois la même séance.
create unique index sessions_external on public.sessions (owner_id, source, external_id) where external_id is not null;

-- ---------------------------------------------------------------- Programmes types de PPG
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  transition integer not null default 15,
  rounds integer not null default 1 check (rounds >= 1)
);

-- ---------------------------------------------------------------- Planning
create table public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  sport text not null,
  label text not null,
  program_id uuid,
  session_id uuid references public.sessions on delete set null,
  done boolean not null default false
);
create index plan_owner_date on public.plan_entries (owner_id, date);

-- ---------------------------------------------------------------- Réglages (une ligne par utilisateur)
create table public.settings (
  owner_id uuid primary key default auth.uid() references auth.users on delete cascade,
  vma numeric(4, 2) not null default 16
);

-- ---------------------------------------------------------------- Règles d'accès
alter table public.sessions enable row level security;
alter table public.programs enable row level security;
alter table public.plan_entries enable row level security;
alter table public.settings enable row level security;

create policy "mes séances" on public.sessions for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "mes programmes" on public.programs for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "mon planning" on public.plan_entries for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "mes réglages" on public.settings for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

revoke all on public.sessions, public.programs, public.plan_entries, public.settings from anon;
grant select, insert, update, delete on public.sessions, public.programs, public.plan_entries, public.settings to authenticated;

-- Temps réel : un autre appareil voit les changements sans recharger.
alter publication supabase_realtime add table public.sessions, public.programs, public.plan_entries, public.settings;

-- ---------------------------------------------------------------- Accès réservé
-- Seules les adresses listées ici peuvent créer un compte (l'app est perso, mais pourra s'ouvrir plus tard).
create table public.allowed_emails (email text primary key);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- Puis activer le hook : Authentication > Hooks > « Before User Created » > type Postgres > public.hook_before_user_created
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
as $$
begin
  if exists (select 1 from public.allowed_emails a where lower(a.email) = lower(event -> 'user' ->> 'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Cette adresse n''est pas autorisée à utiliser l''application.'
  ));
end
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant select on public.allowed_emails to supabase_auth_admin;
create policy "service d'authentification : lecture des adresses" on public.allowed_emails
  for select to supabase_auth_admin using (true);
