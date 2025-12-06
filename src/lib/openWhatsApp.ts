/**
 * فتح رابط واتساب في المتصفح أو التطبيق الخارجي
 * يعمل في كل من المتصفح العادي و Electron
 */
export function openWhatsApp(phoneNumber: string, message: string): void {
  const encodedMessage = encodeURIComponent(message)
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

  // التحقق من وجود Electron
  if (window.electron?.shell) {
    // في بيئة Electron، استخدم shell.openExternal
    window.electron.shell.openExternal(whatsappUrl)
  } else {
    // في المتصفح العادي، استخدم window.open
    window.open(whatsappUrl, '_blank')
  }
}
