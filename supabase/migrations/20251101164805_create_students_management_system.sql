/*
  # نظام إدارة الطلاب المدرسي

  1. الجداول الجديدة
    - `groups` - المجموعات (الفصول)
      - `id` (uuid, مفتاح أساسي)
      - `name` (text) - اسم المجموعة
      - `created_at` (timestamp)

    - `special_statuses` - الحالات الخاصة (يتيم، سكر، ظروف خاصة)
      - `id` (uuid, مفتاح أساسي)
      - `name` (text) - اسم الحالة الخاصة
      - `created_at` (timestamp)

    - `students` - الطلاب
      - `id` (uuid, مفتاح أساسي)
      - `name` (text) - اسم الطالب
      - `national_id` (text, فريد) - السجل المدني
      - `phone` (text) - جوال الطالب
      - `guardian_phone` (text) - جوال ولي الأمر
      - `grade` (text) - الصف
      - `group_id` (uuid) - معرف المجموعة
      - `status` (text) - الحالة (نشط، استئذان)
      - `special_status_id` (uuid) - الحالة الخاصة (اختياري)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات للقراءة والكتابة والحذف

  3. الملاحظات
    - جدول `groups` لتنظيم الطلاب حسب المجموعات
    - جدول `special_statuses` لتصنيف الحالات الخاصة
    - جدول `students` يحتوي على معلومات كاملة للطالب
*/

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS special_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  national_id text UNIQUE NOT NULL,
  phone text NOT NULL,
  guardian_phone text NOT NULL,
  grade text NOT NULL,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'نشط' CHECK (status IN ('نشط', 'استئذان')),
  special_status_id uuid REFERENCES special_statuses(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "السماح بقراءة المجموعات"
  ON groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "السماح بإضافة المجموعات"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل المجموعات"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بحذف المجموعات"
  ON groups
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بقراءة الحالات الخاصة"
  ON special_statuses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "السماح بإضافة الحالات الخاصة"
  ON special_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل الحالات الخاصة"
  ON special_statuses
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بحذف الحالات الخاصة"
  ON special_statuses
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بقراءة الطلاب"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "السماح بإضافة الطلاب"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل الطلاب"
  ON students
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بحذف الطلاب"
  ON students
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_special_status_id ON students(special_status_id);
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
