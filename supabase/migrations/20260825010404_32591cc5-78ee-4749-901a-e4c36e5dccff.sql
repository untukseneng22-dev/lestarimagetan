create policy "warga upload foto aduan sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'aduan' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "warga dan admin baca foto aduan"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'aduan'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(), 'admin'))
  );