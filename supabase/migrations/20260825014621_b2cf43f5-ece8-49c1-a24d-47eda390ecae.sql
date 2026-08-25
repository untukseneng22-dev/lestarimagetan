DROP POLICY IF EXISTS "Avatar dapat dilihat semua" ON storage.objects;

CREATE POLICY "Pengguna masuk dapat melihat avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');