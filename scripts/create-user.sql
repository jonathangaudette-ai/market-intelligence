-- Create user jonathan@mhosaic.com
-- Password hash for: KDkq9{Oa-O)AEo}G

-- First, check if user exists
DO $$
DECLARE
  user_exists BOOLEAN;
  password_hash TEXT;
BEGIN
  -- Bcrypt hash for the password KDkq9{Oa-O)AEo}G
  -- Generated with: bcrypt.hash('KDkq9{Oa-O)AEo}G', 10)
  password_hash := '$2a$10$rSoaMGpyDebD5Inc5wukwu4G3ySKL6eH8g43cR41DfkUi5LrP9YL6';

  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'jonathan@mhosaic.com') INTO user_exists;

  IF user_exists THEN
    -- Update existing user
    UPDATE users
    SET password_hash = password_hash,
        is_super_admin = TRUE,
        updated_at = NOW()
    WHERE email = 'jonathan@mhosaic.com';

    RAISE NOTICE 'User updated: jonathan@mhosaic.com';
  ELSE
    -- Create new user
    INSERT INTO users (id, email, password_hash, name, is_super_admin, created_at, updated_at)
    VALUES (
      -- Generate a cuid2-like ID (simplified for SQL)
      'user_' || substr(md5(random()::text), 1, 24),
      'jonathan@mhosaic.com',
      password_hash,
      'Jonathan Gaudette',
      TRUE,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'User created: jonathan@mhosaic.com';
  END IF;
END $$;

-- Display the user
SELECT id, email, name, is_super_admin, created_at
FROM users
WHERE email = 'jonathan@mhosaic.com';
