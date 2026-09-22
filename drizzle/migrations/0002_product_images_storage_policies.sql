CREATE POLICY "Staff upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Read product images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');
