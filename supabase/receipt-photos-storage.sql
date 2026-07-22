-- Phase 17.1 — Receipt photo import storage
-- Create the "receipt-photos" bucket in the Supabase dashboard first
-- (Storage → New bucket → name "receipt-photos", Public bucket: OFF),
-- then run this in the SQL Editor.
--
-- Kept separate from "recipe-photos" — receipts don't need the same
-- indefinite-retention assumption a recipe photo does, and may get a
-- cleanup policy of their own later. Photos are uploaded to paths shaped
-- {household_id}/{filename} — these policies check the first path segment
-- against the uploader's own household, same isolation model as
-- recipe-photos and every other table (get_my_household_id()).

create policy "Receipt photos readable by household" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = public.get_my_household_id()::text
  );

create policy "Receipt photos insertable by household" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = public.get_my_household_id()::text
  );

create policy "Receipt photos deletable by household" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipt-photos'
    and (storage.foldername(name))[1] = public.get_my_household_id()::text
  );
