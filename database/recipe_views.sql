-- Create recipe_views table to track recipe views
CREATE TABLE IF NOT EXISTS recipe_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id, viewed_at)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recipe_views_user_time 
ON recipe_views(user_id, viewed_at DESC);

-- Create a view for latest recipe views per user
CREATE OR REPLACE VIEW latest_recipe_views AS
SELECT DISTINCT ON (user_id, recipe_id)
    id,
    user_id,
    recipe_id,
    viewed_at
FROM recipe_views
ORDER BY user_id, recipe_id, viewed_at DESC;
