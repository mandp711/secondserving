-- San Diego restaurant directory (public read, no RLS owner requirement)
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query

create table if not exists public.san_diego_restaurants (
  id text primary key,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  rating double precision,
  cuisine text,
  price_level text,
  phone text,
  closing_time text,
  hours_of_operation text,
  menu_items text
);

alter table public.san_diego_restaurants enable row level security;

create policy "Public read access"
  on public.san_diego_restaurants for select
  using (true);

create policy "Service insert access"
  on public.san_diego_restaurants for insert
  with check (true);
