-- NovaLead database setup for Supabase
-- Run this entire file in Supabase > SQL Editor > New query.
-- This schema uses Row Level Security (RLS). Never expose the service_role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 40),
  company text check (company is null or char_length(company) <= 120),
  need text not null default 'Anders' check (char_length(need) <= 100),
  message text check (message is null or char_length(message) <= 2000),
  status text not null default 'Nieuw' check (status in ('Nieuw', 'Opgevolgd', 'Gesloten')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;

-- Create/update a profile after a user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- A user can read their own profile. Admins can read all profiles.
drop policy if exists "Read own profile or admin" on public.profiles;
create policy "Read own profile or admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

-- Public visitors can submit a lead. They cannot read, update or delete leads.
drop policy if exists "Anyone can submit a lead" on public.leads;
create policy "Anyone can submit a lead"
  on public.leads for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 100
    and char_length(email) between 3 and 254
    and status = 'Nieuw'
  );

-- Only administrators can read all leads.
drop policy if exists "Admins can read leads" on public.leads;
create policy "Admins can read leads"
  on public.leads for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

drop policy if exists "Admins can update leads" on public.leads;
create policy "Admins can update leads"
  on public.leads for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));

-- Do not allow ordinary users to change their own role. Promote your own account
-- only with the SQL below, after registering an account.
-- Replace the email with the exact email you used to register:
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'jouw@email.nl');

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
