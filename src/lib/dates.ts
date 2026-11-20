export const pad = (n: number) => String(n).padStart(2, '0')

const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISO(new Date())

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Lundi de la semaine qui contient `iso`. */
export function weekStart(iso: string): string {
  const d = fromISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export const monthOf = (iso: string) => iso.slice(0, 7)

export function addMonths(m: string, n: number): string {
  let [y, mo] = m.split('-').map(Number)
  mo += n
  while (mo > 12) { mo -= 12; y++ }
  while (mo < 1) { mo += 12; y-- }
  return `${y}-${pad(mo)}`
}

export const shortDate = (iso: string) => fromISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
export const longDate = (iso: string) => fromISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
export const fullDate = (iso: string) => fromISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
export const weekdayShort = (iso: string) => fromISO(iso).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
export const monthShort = (m: string) => fromISO(`${m}-01`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
export const monthLabel = (m: string) => fromISO(`${m}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/** « Aujourd'hui », « Hier », ou la date longue. */
export function relativeDay(iso: string): string {
  const t = todayISO()
  if (iso === t) return 'Aujourd’hui'
  if (iso === addDays(t, -1)) return 'Hier'
  return longDate(iso)
}
