create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  city text not null default '',
  phone text not null default '',
  patron_type text not null default '',
  industry text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, city, phone, patron_type, industry, reason)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'city', ''), coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'patron_type', ''), coalesce(new.raw_user_meta_data->>'industry', ''),
    coalesce(new.raw_user_meta_data->>'reason', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  patron_id uuid not null,
  artist_ref text not null,
  artist_name text not null,
  event_date text not null default '',
  slot text not null default '',
  address text not null default '',
  guests text not null default '',
  note text not null default '',
  amount_inr integer not null default 0,
  status text not null default 'awaiting_payment',
  created_at timestamptz not null default now()
);
grant select, insert on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "own bookings read" on public.bookings for select to authenticated using (auth.uid() = patron_id);
create policy "own bookings insert" on public.bookings for insert to authenticated with check (auth.uid() = patron_id and status = 'awaiting_payment');

create table public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  stage_name text not null default '',
  discipline text not null default '',
  base_city text not null default '',
  bio text not null default '',
  rate_inr integer not null default 0,
  reels jsonb not null default '[]'::jsonb,
  status text not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.artist_profiles to authenticated;
grant all on public.artist_profiles to service_role;
alter table public.artist_profiles enable row level security;
create policy "own artist read" on public.artist_profiles for select to authenticated using (auth.uid() = owner_id);
create policy "own artist insert" on public.artist_profiles for insert to authenticated with check (auth.uid() = owner_id and status = 'pending_review');
create policy "own artist update" on public.artist_profiles for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id and status = 'pending_review');