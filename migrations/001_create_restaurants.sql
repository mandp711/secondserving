-- Restaurants table for business registration
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  address text,
  phone text,
  lat double precision,
  lng double precision,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.restaurants enable row level security;

-- Users can read their own restaurants
create policy "Users can read own restaurants"
  on public.restaurants for select
  using (auth.uid() = owner_id);

-- Users can insert their own restaurants
create policy "Users can insert own restaurants"
  on public.restaurants for insert
  with check (auth.uid() = owner_id);

-- Users can update their own restaurants
create policy "Users can update own restaurants"
  on public.restaurants for update
  using (auth.uid() = owner_id);

-- Allow public read for listings (optional - uncomment if you want all restaurants visible)
-- create policy "Public can read verified restaurants"
--   on public.restaurants for select
--   using (is_verified = true);
