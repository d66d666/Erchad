/*
  # إضافة جداول المعلمين والأنشطة

  1. جداول جديدة
    - `teachers` - جدول المعلمين
      - `id` (uuid, primary key)
      - `name` (text) - اسم المعلم
      - `phone` (text) - رقم الجوال
      - `specialization` (text) - المقرر الدراسي
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `teacher_groups` - ربط المعلمين بالمجموعات
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, foreign key)
      - `group_id` (uuid, foreign key)
      - `created_at` (timestamptz)
    
    - `student_visits` - زيارات الطلاب (استقبال)
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `visit_date` (date)
      - `reason` (text)
      - `action_taken` (text)
      - `referred_to` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `student_permissions` - استئذانات الطلاب
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `permission_date` (date)
      - `reason` (text)
      - `guardian_notified` (boolean)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `student_violations` - مخالفات الطلاب
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key)
      - `violation_date` (date)
      - `violation_type` (text)
      - `description` (text)
      - `action_taken` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `school_info` - معلومات المدرسة
      - `id` (uuid, primary key)
      - `school_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات القراءة والكتابة للمستخدمين المصادق عليهم
*/

-- جدول المعلمين
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  specialization text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول ربط المعلمين بالمجموعات
CREATE TABLE IF NOT EXISTS teacher_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, group_id)
);

-- جدول زيارات الطلاب (استقبال)
CREATE TABLE IF NOT EXISTS student_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  action_taken text DEFAULT '',
  referred_to text DEFAULT 'لا يوجد',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- جدول استئذانات الطلاب
CREATE TABLE IF NOT EXISTS student_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  permission_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  guardian_notified boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- جدول مخالفات الطلاب
CREATE TABLE IF NOT EXISTS student_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  violation_date date NOT NULL DEFAULT CURRENT_DATE,
  violation_type text NOT NULL,
  description text NOT NULL,
  action_taken text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- جدول معلومات المدرسة
CREATE TABLE IF NOT EXISTS school_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_info ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمعلمين
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة المعلمين"
  ON teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة المعلمين"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم تحديث المعلمين"
  ON teachers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم حذف المعلمين"
  ON teachers FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لربط المعلمين بالمجموعات
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة ربط المعلمين"
  ON teacher_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة ربط المعلمين"
  ON teacher_groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم حذف ربط المعلمين"
  ON teacher_groups FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لزيارات الطلاب
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة زيارات الطلاب"
  ON student_visits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة زيارات الطلاب"
  ON student_visits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم تحديث زيارات الطلاب"
  ON student_visits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم حذف زيارات الطلاب"
  ON student_visits FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لاستئذانات الطلاب
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة استئذانات الطلاب"
  ON student_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة استئذانات الطلاب"
  ON student_permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم تحديث استئذانات الطلاب"
  ON student_permissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم حذف استئذانات الطلاب"
  ON student_permissions FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لمخالفات الطلاب
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة مخالفات الطلاب"
  ON student_violations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة مخالفات الطلاب"
  ON student_violations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم تحديث مخالفات الطلاب"
  ON student_violations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم حذف مخالفات الطلاب"
  ON student_violations FOR DELETE
  TO authenticated
  USING (true);

-- سياسات الأمان لمعلومات المدرسة
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة معلومات المدرسة"
  ON school_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة معلومات المدرسة"
  ON school_info FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم تحديث معلومات المدرسة"
  ON school_info FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
