/*
  # إصلاح قيد الفريدية في جدول المجموعات

  1. التغييرات
    - إزالة قيد الفريدية (UNIQUE) من حقل name في جدول groups
    - السماح بوجود مجموعات بنفس الاسم في صفوف مختلفة
    - مثال: مجموعة 1 يمكن أن تكون في الصف الأول والصف الثاني والصف الثالث

  2. السبب
    - القيد الحالي يمنع إنشاء مجموعات بنفس الاسم حتى لو كانت في صفوف مختلفة
    - هذا يسبب مشكلة عند استيراد الطلاب من Excel
*/

-- إزالة قيد الفريدية من حقل name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'groups_name_key' 
    AND conrelid = 'groups'::regclass
  ) THEN
    ALTER TABLE groups DROP CONSTRAINT groups_name_key;
  END IF;
END $$;