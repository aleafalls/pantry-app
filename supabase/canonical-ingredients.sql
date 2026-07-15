-- Ingredient/item canonicalization for smarter recipe-to-inventory matching.
-- Run this in the Supabase SQL Editor.

alter table public.items add column if not exists canonical_name text;
alter table public.recipe_ingredients add column if not exists canonical_name text;
alter table public.recipe_ingredients add column if not exists category text;
alter table public.recipe_ingredients add column if not exists is_staple boolean not null default false;
