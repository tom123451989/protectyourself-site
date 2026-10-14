-- Protectyourself Foundation: per-service card image support
-- Run once in Supabase Dashboard -> SQL Editor.
-- This creates a separate public image bucket for service-card pictures.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view service images" ON storage.objects;
CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "Authenticated users can upload service images" ON storage.objects;
CREATE POLICY "Authenticated users can upload service images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'service-images');

DROP POLICY IF EXISTS "Authenticated users can update service images" ON storage.objects;
CREATE POLICY "Authenticated users can update service images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'service-images')
WITH CHECK (bucket_id = 'service-images');

DROP POLICY IF EXISTS "Authenticated users can delete service images" ON storage.objects;
CREATE POLICY "Authenticated users can delete service images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'service-images');
