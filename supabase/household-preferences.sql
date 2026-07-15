-- Phase 14.1 — Chef Preferences data model
-- Run this in the Supabase SQL Editor.

create table public.household_preferences (
  household_id uuid primary key references public.households(id) on delete cascade,
  dietary_restrictions text[] default '{}',
  favorite_cuisines text[] default '{}',
  macro_goals text[] default '{}',
  other_notes text,
  updated_at timestamptz default now()
);
alter table public.household_preferences enable row level security;
create policy "Household preferences readable by household" on public.household_preferences for select to authenticated using (household_id = public.get_my_household_id());
create policy "Household preferences insertable by household" on public.household_preferences for insert to authenticated with check (household_id = public.get_my_household_id());
create policy "Household preferences updatable by household" on public.household_preferences for update to authenticated using (household_id = public.get_my_household_id());
