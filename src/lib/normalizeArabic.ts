/**
 * تطبيع النص العربي للبحث
 * يقوم بتوحيد الأحرف المتشابهة لتسهيل عملية البحث
 *
 * @param text النص المراد تطبيعه
 * @returns النص بعد التطبيع
 */
export function normalizeArabicText(text: string): string {
  if (!text) return ''

  return text
    .toLowerCase()
    .trim()
    // توحيد جميع أشكال الألف
    .replace(/[أإآٱٲٳٵ]/g, 'ا')
    // توحيد التاء المربوطة والهاء
    .replace(/[ة]/g, 'ه')
    // توحيد الياء
    .replace(/[ىيئ]/g, 'ي')
    // إزالة التشكيل
    .replace(/[\u064B-\u065F]/g, '')
    // إزالة المسافات الزائدة
    .replace(/\s+/g, ' ')
}

/**
 * مقارنة نصين عربيين مع التطبيع
 *
 * @param text1 النص الأول
 * @param text2 النص الثاني
 * @returns true إذا كان النصان متطابقان بعد التطبيع
 */
export function arabicTextEquals(text1: string, text2: string): boolean {
  return normalizeArabicText(text1) === normalizeArabicText(text2)
}

/**
 * البحث في نص عربي
 *
 * @param text النص المراد البحث فيه
 * @param searchTerm مصطلح البحث
 * @returns true إذا كان النص يحتوي على مصطلح البحث
 */
export function arabicTextIncludes(text: string, searchTerm: string): boolean {
  return normalizeArabicText(text).includes(normalizeArabicText(searchTerm))
}
