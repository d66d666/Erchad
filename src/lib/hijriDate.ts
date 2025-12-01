import { toHijri } from 'hijri-converter'

export function formatHijriDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const hijriDate = toHijri(
    dateObj.getFullYear(),
    dateObj.getMonth() + 1,
    dateObj.getDate()
  )

  return `${hijriDate.hy}/${hijriDate.hm}/${hijriDate.hd} هـ`
}

export function formatGregorianDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('ar-SA')
}

export function formatBothDates(date: Date | string): string {
  const gregorian = formatGregorianDate(date)
  const hijri = formatHijriDate(date)
  return `${gregorian} - ${hijri}`
}
