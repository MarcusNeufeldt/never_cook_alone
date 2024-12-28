-- Move instructions from recipes table to recipe_steps table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- First, add image_url to recipe_steps if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'recipe_steps' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE recipe_steps ADD COLUMN image_url TEXT;
    END IF;

    -- For each recipe with instructions
    FOR r IN SELECT id, instructions FROM recipes WHERE instructions IS NOT NULL
    LOOP
        -- Insert a single step with the instructions
        INSERT INTO recipe_steps (recipe_id, step_number, instruction)
        VALUES (r.id, 1, r.instructions);
    END LOOP;

    -- Remove the instructions column from recipes
    ALTER TABLE recipes DROP COLUMN IF EXISTS instructions;
END $$;
