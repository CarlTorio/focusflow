
-- Create a public storage bucket for APK downloads
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-releases', 'app-releases', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to download APK files (public read)
CREATE POLICY "Anyone can download app releases"
ON storage.objects
FOR SELECT
USING (bucket_id = 'app-releases');

-- Only authenticated users can upload (admin use)
CREATE POLICY "Authenticated users can upload app releases"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'app-releases' AND auth.role() = 'authenticated');

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update app releases"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'app-releases' AND auth.role() = 'authenticated');

-- Only authenticated users can delete
CREATE POLICY "Authenticated users can delete app releases"
ON storage.objects
FOR DELETE
USING (bucket_id = 'app-releases' AND auth.role() = 'authenticated');
