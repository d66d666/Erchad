/*
  # إضافة جدول سماحات دخول الفصل

  1. جدول جديد
    - `student_class_entries`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key -> students)
      - `entry_date` (timestamptz)
      - `reason` (text)
      - `created_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على الجدول
    - سياسات للقراءة والإضافة للمستخدمين المصادقين
*/

CREATE TABLE IF NOT EXISTS student_class_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  entry_date timestamptz DEFAULT now() NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE student_class_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read class entries"
  ON student_class_entries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert class entries"
  ON student_class_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete class entries"
  ON student_class_entries
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_student_class_entries_student_id ON student_class_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_student_class_entries_entry_date ON student_class_entries(entry_date);