-- Create the storage bucket for recipes
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipes', 'recipes', true);

-- Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipes');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipes'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'recipes'
  AND auth.uid() = owner
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recipes'
  AND auth.uid() = owner
);
