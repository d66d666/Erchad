/*
  # Add visit count to students table

  1. Changes
    - Add `visit_count` column to students table
    - Create function to automatically update visit count
    - Create trigger to update visit count when new visit is inserted
  
  2. Details
    - `visit_count` will track the total number of visits for each student
    - Automatically increments when a new visit is recorded
    - Defaults to 0 for existing and new students
*/

-- Add visit_count column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

-- Update existing students with their current visit counts
UPDATE students
SET visit_count = (
  SELECT COUNT(*)
  FROM student_visits
  WHERE student_visits.student_id = students.id
);

-- Create function to increment visit count
CREATE OR REPLACE FUNCTION increment_student_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE students
  SET visit_count = visit_count + 1
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update visit count on new visit
DROP TRIGGER IF EXISTS update_student_visit_count ON student_visits;
CREATE TRIGGER update_student_visit_count
AFTER INSERT ON student_visits
FOR EACH ROW
EXECUTE FUNCTION increment_student_visit_count();