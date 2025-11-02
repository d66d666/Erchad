/*
  # إضافة حقول stage و display_order لجدول groups

  1. التعديلات
    - إضافة عمود `stage` (المرحلة) لجدول `groups`
    - إضافة عمود `display_order` (الترتيب) لجدول `groups`
  
  2. الملاحظات
    - يسمح بتصنيف المجموعات حسب المرحلة (الصف الأول الثانوي، الثاني، الثالث)
    - يسمح بترتيب المجموعات يدوياً داخل كل مرحلة
*/

-- Add stage column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'stage'
  ) THEN
    ALTER TABLE groups ADD COLUMN stage TEXT DEFAULT 'الصف الاول الثانوي';
  END IF;
END $$;

-- Add display_order column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE groups ADD COLUMN display_order INTEGER DEFAULT 999;
  END IF;
END $$;