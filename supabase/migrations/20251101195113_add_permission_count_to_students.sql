/*
  # Add permission count to students table

  1. Changes
    - Add `permission_count` column to students table
    - Create function to automatically update permission count
    - Create trigger to update permission count when new permission is inserted
  
  2. Details
    - `permission_count` will track the total number of permissions for each student
    - Automatically increments when a new permission is recorded
    - Defaults to 0 for existing and new students
*/

-- Add permission_count column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS permission_count INTEGER DEFAULT 0;

-- Update existing students with their current permission counts
UPDATE students
SET permission_count = (
  SELECT COUNT(*)
  FROM student_permissions
  WHERE student_permissions.student_id = students.id
);

-- Create function to increment permission count
CREATE OR REPLACE FUNCTION increment_student_permission_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE students
  SET permission_count = permission_count + 1
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update permission count on new permission
DROP TRIGGER IF EXISTS update_student_permission_count ON student_permissions;
CREATE TRIGGER update_student_permission_count
AFTER INSERT ON student_permissions
FOR EACH ROW
EXECUTE FUNCTION increment_student_permission_count();