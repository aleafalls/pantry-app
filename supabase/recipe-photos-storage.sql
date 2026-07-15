-- Phase 16.1 — Recipe photo import storage
-- Create the "recipe-photos" bucket in the Supabase dashboard first
-- (Storage → New bucket → name "recipe-photos", Public bucket: OFF),
-- then run this in the SQL Editor.
--
-- Photos are uploaded to paths shaped {household_id}/{filename} — these
-- policies check the first path segment against the uploader's own
-- household, same isolation model as every other table (get_my_household_id()).

create policy "Recipe photos readable by household" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = public.get_my_household_id()::text
  );

create policy "Recipe photos insertable by household" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = public.get_my_household_id()::text
  );

create policy "Recipe photos deletable by household" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-photos'
    and (storage.foldername(name))[1] = public.get_my_household_id()::text
  );
