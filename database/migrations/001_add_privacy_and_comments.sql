-- Migration to add privacy controls and comments system
BEGIN;

-- Add new columns to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'published';

-- Create recipe_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS recipe_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments if they don't exist
CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe ON recipe_comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_user ON recipe_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_created ON recipe_comments(created_at DESC);

-- Enable RLS on new table
ALTER TABLE recipe_comments ENABLE ROW LEVEL SECURITY;

-- Add trigger for comments updated_at (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_recipe_comments') THEN
        CREATE TRIGGER set_timestamp_recipe_comments
            BEFORE UPDATE ON recipe_comments
            FOR EACH ROW
            EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END
$$;

-- Recipe comments policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON recipe_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON recipe_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON recipe_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON recipe_comments;

CREATE POLICY "Comments are viewable by everyone"
    ON recipe_comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create comments"
    ON recipe_comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own comments"
    ON recipe_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON recipe_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Update recipes policy to respect privacy setting
DROP POLICY IF EXISTS "Recipes are viewable by everyone" ON recipes;
DROP POLICY IF EXISTS "Public recipes are viewable by everyone" ON recipes;
CREATE POLICY "Public recipes are viewable by everyone"
    ON recipes FOR SELECT
    USING (is_public = true OR auth.uid() = author_id);

COMMIT;
