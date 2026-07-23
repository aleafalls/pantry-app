-- Quick Pantry Setup — persists whether a household has dismissed the
-- onboarding "Quick Pantry Setup" dashboard card (manually, or automatically
-- once the household reaches 10+ distinct items).
-- Run this in the Supabase SQL Editor after household-preferences.sql.

alter table public.household_preferences
  add column if not exists dismissed_quick_setup boolean not null default false;
