/*
  # إصلاح سياسات RLS لجداول الزيارات والاستئذان

  1. التعديلات
    - إضافة سياسات للمستخدمين المجهولين (anon) لجدول student_visits
    - إضافة سياسات للمستخدمين المجهولين (anon) لجدول student_permissions
    
  2. الأمان
    - السماح للمستخدمين المجهولين بإجراء جميع العمليات CRUD
    - هذا يتوافق مع باقي الجداول في النظام
*/

-- حذف السياسات القديمة لجدول student_visits
DROP POLICY IF EXISTS "السماح بقراءة سجل الزيارات" ON student_visits;
DROP POLICY IF EXISTS "السماح بإضافة سجل الزيارات" ON student_visits;
DROP POLICY IF EXISTS "السماح بتعديل سجل الزيارات" ON student_visits;
DROP POLICY IF EXISTS "السماح بحذف سجل الزيارات" ON student_visits;

-- إضافة سياسات جديدة تسمح للمستخدمين المجهولين
CREATE POLICY "السماح بقراءة سجل الزيارات"
  ON student_visits
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "السماح بإضافة سجل الزيارات"
  ON student_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل سجل الزيارات"
  ON student_visits
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "السماح بحذف سجل الزيارات"
  ON student_visits
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- حذف السياسات القديمة لجدول student_permissions
DROP POLICY IF EXISTS "السماح بقراءة سجل الاستئذان" ON student_permissions;
DROP POLICY IF EXISTS "السماح بإضافة سجل الاستئذان" ON student_permissions;
DROP POLICY IF EXISTS "السماح بتعديل سجل الاستئذان" ON student_permissions;
DROP POLICY IF EXISTS "السماح بحذف سجل الاستئذان" ON student_permissions;

-- إضافة سياسات جديدة تسمح للمستخدمين المجهولين
CREATE POLICY "السماح بقراءة سجل الاستئذان"
  ON student_permissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "السماح بإضافة سجل الاستئذان"
  ON student_permissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "السماح بتعديل سجل الاستئذان"
  ON student_permissions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "السماح بحذف سجل الاستئذان"
  ON student_permissions
  FOR DELETE
  TO anon, authenticated
  USING (true);
