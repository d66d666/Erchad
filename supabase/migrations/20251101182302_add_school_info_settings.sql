/*
  # إضافة جدول معلومات المدرسة

  1. جدول جديد
    - `school_info`
      - `id` (uuid, primary key)
      - `school_name` (text) - اسم المدرسة
      - `counselor_name` (text) - اسم المرشد الطلابي
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جدول `school_info`
    - السماح للجميع بالقراءة (لعرض البيانات في التطبيق)
    - السماح للجميع بالتحديث (لتعديل الإعدادات)

  3. ملاحظات
    - سيحتوي الجدول على سجل واحد فقط
    - إضافة سجل افتراضي مبدئي
*/

-- إنشاء جدول معلومات المدرسة
CREATE TABLE IF NOT EXISTS school_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'اسم المدرسة',
  counselor_name text NOT NULL DEFAULT 'اسم المرشد الطلابي',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE school_info ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع
CREATE POLICY "Allow public read access to school_info"
  ON school_info
  FOR SELECT
  USING (true);

-- سياسة التحديث للجميع
CREATE POLICY "Allow public update access to school_info"
  ON school_info
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- إضافة سجل افتراضي إذا لم يكن موجود
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM school_info LIMIT 1) THEN
    INSERT INTO school_info (school_name, counselor_name)
    VALUES ('اسم المدرسة', 'اسم المرشد الطلابي');
  END IF;
END $$;
