-- Insert sample categories
INSERT INTO categories (name, description, slug) VALUES
('Breakfast', 'Start your day right with these breakfast recipes', 'breakfast'),
('Main Course', 'Hearty main dishes for lunch or dinner', 'main-course'),
('Desserts', 'Sweet treats and desserts', 'desserts'),
('Quick & Easy', 'Ready in 30 minutes or less', 'quick-and-easy');

-- Insert sample ingredients
INSERT INTO ingredients (name) VALUES
('Eggs'),
('Milk'),
('Flour'),
('Sugar'),
('Salt'),
('Butter'),
('Olive Oil'),
('Garlic'),
('Onion'),
('Tomatoes'),
('Pasta'),
('Chicken Breast'),
('Rice'),
('Vanilla Extract'),
('Chocolate');

-- First, get your user ID from Supabase auth.users
BEGIN;
DO $$ 
DECLARE
    user_id UUID;
BEGIN
    -- Get the first user ID from auth.users
    SELECT id INTO user_id FROM auth.users LIMIT 1;

    -- Create a profile for this user if it doesn't exist
    INSERT INTO profiles (id, username, display_name)
    VALUES (user_id, 'demo_user', 'Demo User')
    ON CONFLICT (id) DO NOTHING;

    -- Insert sample recipes using the same user_id
    INSERT INTO recipes (
        name,
        description,
        instructions,
        prep_time_minutes,
        cook_time_minutes,
        servings,
        difficulty_level,
        is_featured,
        image_url,
        author_id,
        category_id
    ) VALUES (
        'Classic Pancakes',
        'Fluffy, golden pancakes perfect for any morning',
        'Mix dry ingredients. Combine wet ingredients separately. Mix wet into dry until just combined. Cook on medium heat.',
        10,
        15,
        4,
        'easy',
        true,
        'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
        user_id,
        (SELECT id FROM categories WHERE slug = 'breakfast')
    );

    -- Get the ID of the recipe we just inserted
    WITH recipe_id_cte AS (
        SELECT id FROM recipes WHERE name = 'Classic Pancakes'
    )
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
    SELECT 
        (SELECT id FROM recipe_id_cte),
        ingredients.id,
        q.quantity,
        q.unit
    FROM (
        VALUES 
            ('Flour', 1.5, 'cups'),
            ('Milk', 1.25, 'cups'),
            ('Eggs', 1, 'whole'),
            ('Sugar', 2, 'tablespoons'),
            ('Butter', 3, 'tablespoons')
    ) AS q(ingredient_name, quantity, unit)
    JOIN ingredients ON ingredients.name = q.ingredient_name;

    -- Insert another sample recipe
    INSERT INTO recipes (
        name,
        description,
        instructions,
        prep_time_minutes,
        cook_time_minutes,
        servings,
        difficulty_level,
        is_featured,
        image_url,
        author_id,
        category_id
    ) VALUES (
        'Spaghetti Aglio e Olio',
        'A classic Italian pasta dish with garlic and olive oil',
        'Cook pasta. Sauté garlic in olive oil. Combine with pasta, add red pepper flakes and parsley.',
        5,
        15,
        2,
        'easy',
        true,
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
        user_id,
        (SELECT id FROM categories WHERE slug = 'main-course')
    );

    -- Insert ingredients for the second recipe
    WITH recipe_id_cte AS (
        SELECT id FROM recipes WHERE name = 'Spaghetti Aglio e Olio'
    )
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
    SELECT 
        (SELECT id FROM recipe_id_cte),
        ingredients.id,
        q.quantity,
        q.unit
    FROM (
        VALUES 
            ('Pasta', 250, 'grams'),
            ('Olive Oil', 0.25, 'cup'),
            ('Garlic', 4, 'cloves'),
            ('Salt', 1, 'teaspoon')
    ) AS q(ingredient_name, quantity, unit)
    JOIN ingredients ON ingredients.name = q.ingredient_name;

END $$;
COMMIT;
