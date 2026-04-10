/** Calendar YYYY-MM-DD in local timezone — avoid mixing local Date with `toISOString()` (UTC). */

export function calendarTodayIso(): string {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addCalendarDaysIso(isoDate: string, deltaDays: number): string {
  const [y, mo, da] = isoDate.split('-').map(Number)
  const dt = new Date(y, mo - 1, da + deltaDays)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function parseIsoToLocalNoon(isoDate: string): Date {
  const [y, mo, da] = isoDate.split('-').map(Number)
  return new Date(y, mo - 1, da, 12, 0, 0, 0)
}
