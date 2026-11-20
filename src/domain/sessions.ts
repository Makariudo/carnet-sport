/** Calculs sur les séances : distance retenue, allure/vitesse affichée, agrégats hebdo et mensuels. */
import type { Session, Sport } from './types'
import { blocksDistance } from './blocks'
import { addDays, addMonths, monthOf, monthShort, shortDate, todayISO, weekStart } from '../lib/dates'
import { fmtPace, fmtSpeed, fmtSwimPace, pacePerKm } from '../lib/time'

export const SPORT_LABEL: Record<Sport, string> = {
  course: 'Course',
  velo: 'Vélo',
  'home-trainer': 'Home trainer',
  natation: 'Natation',
  ppg: 'PPG',
}

/** Distance retenue pour les stats : la distance saisie, sinon celle des répétitions. */
export function sessionDistance(s: Session): number {
  if (s.distance) return s.distance
  return s.blocks?.length ? blocksDistance(s.blocks) : 0
}

/** « 4'52/km », « 28,4 km/h », « 1'55/100 m » selon le sport, ou null si on ne peut pas calculer. */
export function speedLabel(s: Session): string | null {
  const d = s.distance, t = s.duration
  if (!d || !t) return null
  if (s.sport === 'course') return fmtPace(pacePerKm(d, t))
  if (s.sport === 'natation') return fmtSwimPace(d, t)
  if (s.sport === 'velo' || s.sport === 'home-trainer') return fmtSpeed(d, t)
  return null
}

/** Filtre des stats : un sport, ou le vélo avec le home trainer. */
export type StatFilter = 'course' | 'velo' | 'natation' | 'tout'
export function matches(s: Session, f: StatFilter): boolean {
  if (f === 'tout') return s.sport !== 'ppg'
  if (f === 'velo') return s.sport === 'velo' || s.sport === 'home-trainer'
  return s.sport === f
}

export interface Bucket {
  key: string
  label: string
  /** Mètres. */
  distance: number
  /** Secondes. */
  duration: number
  count: number
}

/** Les `n` dernières semaines (lundi → dimanche), la courante en dernier. */
export function weeklyBuckets(sessions: Session[], f: StatFilter, n = 12, today = todayISO()): Bucket[] {
  const start = weekStart(today)
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const k = addDays(start, -7 * i)
    out.push({ key: k, label: shortDate(k), distance: 0, duration: 0, count: 0 })
  }
  const idx = new Map(out.map((b, i) => [b.key, i]))
  for (const s of sessions) {
    if (!matches(s, f)) continue
    const i = idx.get(weekStart(s.date))
    if (i === undefined) continue
    out[i].distance += sessionDistance(s)
    out[i].duration += s.duration ?? 0
    out[i].count++
  }
  return out
}

/** Les `n` derniers mois, le courant en dernier. */
export function monthlyBuckets(sessions: Session[], f: StatFilter, n = 12, today = todayISO()): Bucket[] {
  const cur = monthOf(today)
  const out: Bucket[] = []
  for (let i = n - 1; i >= 0; i--) {
    const k = addMonths(cur, -i)
    out.push({ key: k, label: monthShort(k), distance: 0, duration: 0, count: 0 })
  }
  const idx = new Map(out.map((b, i) => [b.key, i]))
  for (const s of sessions) {
    if (!matches(s, f)) continue
    const i = idx.get(monthOf(s.date))
    if (i === undefined) continue
    out[i].distance += sessionDistance(s)
    out[i].duration += s.duration ?? 0
    out[i].count++
  }
  return out
}

export interface Totals { distance: number; duration: number; count: number }
export function totalsSince(sessions: Session[], f: StatFilter, from: string): Totals {
  const t = { distance: 0, duration: 0, count: 0 }
  for (const s of sessions) {
    if (s.date < from || !matches(s, f)) continue
    t.distance += sessionDistance(s)
    t.duration += s.duration ?? 0
    t.count++
  }
  return t
}

export const byDateDesc = (a: Session, b: Session) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)
