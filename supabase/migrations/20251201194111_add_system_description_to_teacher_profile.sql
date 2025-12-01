/*
  # Add system_description column to teacher_profile

  1. Changes
    - Add `system_description` column to `teacher_profile` table
    - This column will store the system description/title that appears on the main page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_profile' AND column_name = 'system_description'
  ) THEN
    ALTER TABLE teacher_profile ADD COLUMN system_description text DEFAULT '';
  END IF;
END $$;
