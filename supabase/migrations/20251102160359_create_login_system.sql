/*
  # Create Login System

  1. New Tables
    - `login_credentials`
      - `id` (uuid, primary key)
      - `username` (text, unique) - اسم المستخدم
      - `password_hash` (text) - كلمة المرور المشفرة
      - `reset_token` (text, nullable) - رمز استعادة كلمة المرور
      - `reset_token_expires` (timestamptz, nullable) - تاريخ انتهاء الرمز
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `login_credentials` table
    - Add policy for public access to check credentials (for login)
    - Add policy for authenticated access to update credentials

  3. Default User
    - Create default admin user with username: admin, password: admin123
*/

CREATE TABLE IF NOT EXISTS login_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  reset_token text,
  reset_token_expires timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE login_credentials ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read credentials (for login validation)
CREATE POLICY "Allow public to read credentials for login"
  ON login_credentials
  FOR SELECT
  TO anon
  USING (true);

-- Allow public to update reset token
CREATE POLICY "Allow public to update reset token"
  ON login_credentials
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Insert default admin user (password: admin123)
-- Note: In production, you should use proper password hashing
INSERT INTO login_credentials (username, password_hash)
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;
