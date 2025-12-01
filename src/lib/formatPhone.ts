/**
 * تنسيق رقم الجوال للاستخدام في واتساب
 * يزيل جميع الأحرف غير الرقمية
 * يزيل رمز الدولة 966 إن وجد
 * يزيل جميع الأصفار من البداية
 * يضيف رمز الدولة 966 (السعودية)
 *
 * @param phone رقم الجوال (مثال: 0555555555 أو 9660555555555 أو 00966555555555)
 * @returns رقم منسق للواتساب (مثال: 966555555555) أو نص فارغ إذا كان الرقم غير صالح
 */
export function formatPhoneForWhatsApp(phone: string | undefined | null): string {
  if (!phone) return ''

  let cleaned = phone.replace(/\D/g, '')

  cleaned = cleaned.replace(/^0+/, '')

  if (cleaned.startsWith('966')) {
    cleaned = cleaned.substring(3)
  }

  cleaned = cleaned.replace(/^0+/, '')

  if (!cleaned) return ''

  return '966' + cleaned
}
