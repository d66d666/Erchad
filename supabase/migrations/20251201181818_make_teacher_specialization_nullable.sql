/*
  # Make teacher specialization optional

  1. Changes
    - Alter `teachers` table to make `specialization` column nullable
    - This allows teachers to be added without specifying a stage (المرحلة)

  2. Notes
    - Existing data is preserved
    - The field will now represent "المرحلة" (stage) instead of "المقرر الدراسي"
*/

ALTER TABLE teachers 
ALTER COLUMN specialization DROP NOT NULL;
