/*
  # إضافة جداول لاستقبال الطلاب والاستئذان

  1. الجداول الجديدة
    - `student_visits` - سجل استقبال الطلاب ومعالجة مشاكلهم
      - `id` (uuid, مفتاح أساسي)
      - `student_id` (uuid) - معرف الطالب
      - `visit_date` (timestamptz) - تاريخ ووقت الزيارة
      - `reason` (text) - سبب الزيارة/المشكلة
      - `action_taken` (text) - الإجراء المتخذ
      - `referred_to` (text) - التحويل إلى (مشرف صحي، وكيل، مدير، معلم)
      - `notes` (text) - ملاحظات إضافية
      - `created_at` (timestamptz)
    
    - `student_permissions` - سجل استئذان الطلاب
      - `id` (uuid, مفتاح أساسي)
      - `student_id` (uuid) - معرف الطالب
      - `permission_date` (timestamptz) - تاريخ ووقت الاستئذان
      - `reason` (text) - سبب الاستئذان
      - `guardian_notified` (boolean) - تم إبلاغ ولي الأمر
      - `notes` (text) - ملاحظات
      - `created_at` (timestamptz)

  2. الأمان
    - تفعيل RLS على الجداول الجديدة
    - سياسات CRUD كاملة للمستخدمين المصرح لهم

  3. الفهارس
    - فهرس على student_id لتحسين أداء الاستعلامات
*/

CREATE TABLE IF NOT EXISTS student_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  visit_date timestamptz DEFAULT now(),
  reason text NOT NULL,
  action_taken text NOT NULL,
  referred_to text CHECK (referred_to IN ('لا يوجد', 'مشرف صحي', 'وكيل', 'مدير', 'معلم')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  permission_date timestamptz DEFAULT now(),
  reason text NOT NULL,
  guardian_notified boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "السماح بقراءة سجل الزيارات"
  ON student_visits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "السماح بإضافة سجل الزيارات"
  ON student_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل سجل الزيارات"
  ON student_visits
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بحذف سجل الزيارات"
  ON student_visits
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بقراءة سجل الاستئذان"
  ON student_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "السماح بإضافة سجل الاستئذان"
  ON student_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل سجل الاستئذان"
  ON student_permissions
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "السماح بحذف سجل الاستئذان"
  ON student_permissions
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_student_visits_student_id ON student_visits(student_id);
CREATE INDEX IF NOT EXISTS idx_student_visits_date ON student_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_student_permissions_student_id ON student_permissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_permissions_date ON student_permissions(permission_date);
