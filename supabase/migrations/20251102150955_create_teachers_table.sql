/*
  # Create Teachers Table

  1. New Tables
    - `teachers`
      - `id` (uuid, primary key)
      - `name` (text) - اسم المعلم
      - `phone` (text) - رقم جوال المعلم
      - `specialization` (text) - التخصص
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. New Tables
    - `teacher_groups`
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, foreign key to teachers)
      - `group_id` (uuid, foreign key to groups)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on both tables
    - Add policies for anonymous and authenticated users to manage data
*/

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  specialization text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create teacher_groups junction table
CREATE TABLE IF NOT EXISTS teacher_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, group_id)
);

-- Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_groups ENABLE ROW LEVEL SECURITY;

-- Teachers policies
CREATE POLICY "السماح بقراءة المعلمين للجميع"
  ON teachers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "السماح بإضافة المعلمين للجميع"
  ON teachers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل المعلمين للجميع"
  ON teachers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "السماح بحذف المعلمين للجميع"
  ON teachers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Teacher groups policies
CREATE POLICY "السماح بقراءة مجموعات المعلمين للجميع"
  ON teacher_groups FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "السماح بإضافة مجموعات المعلمين للجميع"
  ON teacher_groups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بحذف مجموعات المعلمين للجميع"
  ON teacher_groups FOR DELETE
  TO anon, authenticated
  USING (true);