/*
  # إضافة صلاحيات للمستخدمين غير المصادقين
  
  1. التغييرات
    - إضافة سياسات RLS للسماح بالوصول العام (anon) لجميع الجداول
    - السماح للمستخدمين غير المصادقين بقراءة وإضافة وتعديل وحذف البيانات
  
  2. الجداول المتأثرة
    - `students` - إضافة سياسات للمستخدمين غير المصادقين
    - `groups` - إضافة سياسات للمستخدمين غير المصادقين
    - `special_statuses` - إضافة سياسات للمستخدمين غير المصادقين
*/

-- سياسات جدول students للمستخدمين غير المصادقين
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'السماح بقراءة الطلاب للجميع'
  ) THEN
    CREATE POLICY "السماح بقراءة الطلاب للجميع"
      ON students
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'السماح بإضافة الطلاب للجميع'
  ) THEN
    CREATE POLICY "السماح بإضافة الطلاب للجميع"
      ON students
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'السماح بتعديل الطلاب للجميع'
  ) THEN
    CREATE POLICY "السماح بتعديل الطلاب للجميع"
      ON students
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'السماح بحذف الطلاب للجميع'
  ) THEN
    CREATE POLICY "السماح بحذف الطلاب للجميع"
      ON students
      FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;

-- سياسات جدول groups للمستخدمين غير المصادقين
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'groups' 
    AND policyname = 'السماح بقراءة المجموعات للجميع'
  ) THEN
    CREATE POLICY "السماح بقراءة المجموعات للجميع"
      ON groups
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'groups' 
    AND policyname = 'السماح بإضافة المجموعات للجميع'
  ) THEN
    CREATE POLICY "السماح بإضافة المجموعات للجميع"
      ON groups
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'groups' 
    AND policyname = 'السماح بتعديل المجموعات للجميع'
  ) THEN
    CREATE POLICY "السماح بتعديل المجموعات للجميع"
      ON groups
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'groups' 
    AND policyname = 'السماح بحذف المجموعات للجميع'
  ) THEN
    CREATE POLICY "السماح بحذف المجموعات للجميع"
      ON groups
      FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;

-- سياسات جدول special_statuses للمستخدمين غير المصادقين
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'special_statuses' 
    AND policyname = 'السماح بقراءة الحالات الخاصة للجميع'
  ) THEN
    CREATE POLICY "السماح بقراءة الحالات الخاصة للجميع"
      ON special_statuses
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'special_statuses' 
    AND policyname = 'السماح بإضافة الحالات الخاصة للجميع'
  ) THEN
    CREATE POLICY "السماح بإضافة الحالات الخاصة للجميع"
      ON special_statuses
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'special_statuses' 
    AND policyname = 'السماح بتعديل الحالات الخاصة للجميع'
  ) THEN
    CREATE POLICY "السماح بتعديل الحالات الخاصة للجميع"
      ON special_statuses
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'special_statuses' 
    AND policyname = 'السماح بحذف الحالات الخاصة للجميع'
  ) THEN
    CREATE POLICY "السماح بحذف الحالات الخاصة للجميع"
      ON special_statuses
      FOR DELETE
      TO anon
      USING (true);
  END IF;
END $$;
