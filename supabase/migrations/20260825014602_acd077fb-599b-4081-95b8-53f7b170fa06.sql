ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE POLICY "Avatar dapat dilihat semua"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Pengguna mengunggah avatar miliknya"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Pengguna mengubah avatar miliknya"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Pengguna menghapus avatar miliknya"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);