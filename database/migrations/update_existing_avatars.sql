-- Update existing profiles with their Google avatar URLs
UPDATE profiles 
SET avatar_url = (
    SELECT raw_user_meta_data->>'avatar_url' 
    FROM auth.users 
    WHERE auth.users.id = profiles.id
)
WHERE EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = profiles.id 
    AND raw_user_meta_data->>'avatar_url' IS NOT NULL
);
