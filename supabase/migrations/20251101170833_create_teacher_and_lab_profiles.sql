/*
  # إنشاء جداول الملف الشخصي للأستاذ ومعلومات المعمل

  1. الجداول الجديدة
    - `teacher_profile` - ملف الأستاذ الشخصي
      - `id` (uuid, primary key)
      - `name` (text) - اسم الأستاذ
      - `phone` (text) - رقم جوال الأستاذ
      - `school_name` (text) - اسم المدرسة
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `lab_contact` - معلومات المعمل
      - `id` (uuid, primary key)
      - `name` (text) - اسم المعمل
      - `phone` (text) - رقم جوال المعمل
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - إضافة سياسات للسماح بالوصول العام
*/

-- جدول الملف الشخصي للأستاذ
CREATE TABLE IF NOT EXISTS teacher_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  school_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول معلومات المعمل
CREATE TABLE IF NOT EXISTS lab_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE teacher_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_contact ENABLE ROW LEVEL SECURITY;

-- سياسات teacher_profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teacher_profile' 
    AND policyname = 'السماح بقراءة الملف الشخصي للجميع'
  ) THEN
    CREATE POLICY "السماح بقراءة الملف الشخصي للجميع"
      ON teacher_profile
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teacher_profile' 
    AND policyname = 'السماح بإضافة الملف الشخصي للجميع'
  ) THEN
    CREATE POLICY "السماح بإضافة الملف الشخصي للجميع"
      ON teacher_profile
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teacher_profile' 
    AND policyname = 'السماح بتعديل الملف الشخصي للجميع'
  ) THEN
    CREATE POLICY "السماح بتعديل الملف الشخصي للجميع"
      ON teacher_profile
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- سياسات lab_contact
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lab_contact' 
    AND policyname = 'السماح بقراءة معلومات المعمل للجميع'
  ) THEN
    CREATE POLICY "السماح بقراءة معلومات المعمل للجميع"
      ON lab_contact
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lab_contact' 
    AND policyname = 'السماح بإضافة معلومات المعمل للجميع'
  ) THEN
    CREATE POLICY "السماح بإضافة معلومات المعمل للجميع"
      ON lab_contact
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lab_contact' 
    AND policyname = 'السماح بتعديل معلومات المعمل للجميع'
  ) THEN
    CREATE POLICY "السماح بتعديل معلومات المعمل للجميع"
      ON lab_contact
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- إنشاء سجل افتراضي للأستاذ
INSERT INTO teacher_profile (name, phone, school_name)
SELECT '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM teacher_profile);

-- إنشاء سجل افتراضي للمعمل
INSERT INTO lab_contact (name, phone)
SELECT '', ''
WHERE NOT EXISTS (SELECT 1 FROM lab_contact);
