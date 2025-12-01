import { toHijri } from 'hijri-converter'

export function formatHijriDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const hijriDate = toHijri(
    dateObj.getFullYear(),
    dateObj.getMonth() + 1,
    dateObj.getDate()
  )

  return `${hijriDate.hd}/${hijriDate.hm}/${hijriDate.hy} هـ`
}

export function formatGregorianDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${day}/${month}/${year} م`
}

export function formatBothDates(date: Date | string): string {
  const hijri = formatHijriDate(date)
  const gregorian = formatGregorianDate(date)
  return `${hijri} - ${gregorian}`
}
