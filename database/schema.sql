-- Schema for Never Cook Alone
-- Core Tables

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Categories for recipes
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Recipes
CREATE TABLE recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    is_featured BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'published',
    author_id UUID REFERENCES profiles(id) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Recipe Steps
CREATE TABLE recipe_steps (
    id SERIAL PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    image_url TEXT,
    UNIQUE(recipe_id, step_number)
);

-- Ingredients
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Recipe Ingredients (junction table)
CREATE TABLE recipe_ingredients (
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL,
    unit TEXT,
    notes TEXT,
    PRIMARY KEY (recipe_id, ingredient_id)
);

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

-- Indexes for better query performance
CREATE INDEX idx_recipes_author ON recipes(author_id);
CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);

-- Create recipe_comments table
CREATE TABLE IF NOT EXISTS recipe_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX idx_recipe_comments_recipe ON recipe_comments(recipe_id);
CREATE INDEX idx_recipe_comments_user ON recipe_comments(user_id);
CREATE INDEX idx_recipe_comments_created ON recipe_comments(created_at DESC);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_recipes
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_recipe_comments
    BEFORE UPDATE ON recipe_comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_comments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Recipes policies
CREATE POLICY "Public recipes are viewable by everyone"
    ON recipes FOR SELECT
    USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY "Authenticated users can create recipes"
    ON recipes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own recipes"
    ON recipes FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own recipes"
    ON recipes FOR DELETE
    USING (auth.uid() = author_id);

-- Recipe comments policies
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
