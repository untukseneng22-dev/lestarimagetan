CREATE POLICY "Pengguna masuk melihat foto produk"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'produk');

CREATE POLICY "Admin mengunggah foto produk"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'produk' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin mengubah foto produk"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'produk' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin menghapus foto produk"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'produk' AND public.has_role(auth.uid(), 'admin'::app_role));