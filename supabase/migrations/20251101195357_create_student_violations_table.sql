/*
  # Create student violations table

  1. New Tables
    - `student_violations`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key to students)
      - `violation_date` (timestamptz, default now)
      - `violation_type` (text, type of violation)
      - `description` (text, description of the violation)
      - `action_taken` (text, action taken for the violation)
      - `notes` (text, additional notes)
      - `created_at` (timestamptz, default now)
  
  2. Security
    - Enable RLS on `student_violations` table
    - Add policies for anonymous users to read/write violations

  3. Violation Types
    - هروب من الحصة
    - غياب بدون عذر
    - تأخر صباحي
    - عدم إحضار الكتب
    - سلوك غير لائق
    - استخدام الجوال
    - عدم ارتداء الزي المدرسي
    - أخرى
*/

-- Create student_violations table
CREATE TABLE IF NOT EXISTS student_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  violation_date timestamptz DEFAULT now(),
  violation_type text NOT NULL CHECK (
    violation_type IN (
      'هروب من الحصة',
      'غياب بدون عذر',
      'تأخر صباحي',
      'عدم إحضار الكتب',
      'سلوك غير لائق',
      'استخدام الجوال',
      'عدم ارتداء الزي المدرسي',
      'أخرى'
    )
  ),
  description text NOT NULL,
  action_taken text NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE student_violations ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (matching other tables)
CREATE POLICY "Allow anonymous read access to student_violations"
  ON student_violations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to student_violations"
  ON student_violations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to student_violations"
  ON student_violations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to student_violations"
  ON student_violations FOR DELETE
  TO anon
  USING (true);

-- Add violation_count column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0;

-- Update existing students with their current violation counts
UPDATE students
SET violation_count = (
  SELECT COUNT(*)
  FROM student_violations
  WHERE student_violations.student_id = students.id
);

-- Create function to increment violation count
CREATE OR REPLACE FUNCTION increment_student_violation_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE students
  SET violation_count = violation_count + 1
  WHERE id = NEW.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update violation count on new violation
DROP TRIGGER IF EXISTS update_student_violation_count ON student_violations;
CREATE TRIGGER update_student_violation_count
AFTER INSERT ON student_violations
FOR EACH ROW
EXECUTE FUNCTION increment_student_violation_count();