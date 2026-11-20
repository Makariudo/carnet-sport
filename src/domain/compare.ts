/** Regroupement et comparaison des jalons (séances favorites). */
import type { Session } from './types'
import { avgRepTime, blockPace, sessionSignature } from './blocks'
import { SPORT_LABEL, sessionDistance } from './sessions'
import { fmtDistance } from '../lib/time'

/** Les séances comparables ensemble : même structure de blocs, sinon même sport, type et distance arrondie. */
export function compareKey(s: Session): string {
  const sig = sessionSignature(s)
  if (sig) return `${s.sport}|${sig}`
  const d = sessionDistance(s)
  return `${s.sport}|${s.kind ?? ''}|${d ? Math.round(d / 500) * 500 : ''}`
}

export function groupLabel(s: Session): string {
  const sig = sessionSignature(s)
  if (sig) return sig.replace(/x/g, ' × ')
  const d = sessionDistance(s)
  return [SPORT_LABEL[s.sport], s.kind, d ? fmtDistance(Math.round(d / 500) * 500) : null].filter(Boolean).join(' · ')
}

export interface Group { key: string; label: string; sessions: Session[] }

export function groupFavorites(sessions: Session[]): Group[] {
  const groups = new Map<string, Group>()
  for (const s of sessions) {
    if (!s.favorite) continue
    const k = compareKey(s)
    if (!groups.has(k)) groups.set(k, { key: k, label: groupLabel(s), sessions: [] })
    groups.get(k)!.sessions.push(s)
  }
  for (const g of groups.values()) g.sessions.sort((a, b) => (a.date < b.date ? 1 : -1))
  // Les groupes les plus fournis puis les plus récents d'abord.
  return [...groups.values()].sort((a, b) => b.sessions.length - a.sessions.length || (a.sessions[0].date < b.sessions[0].date ? 1 : -1))
}

export interface Metrics {
  /** Temps moyen d'une répétition du premier bloc (s). */
  avgRep?: number
  /** Allure moyenne du premier bloc (s/km). */
  pace?: number
  best?: number
  worst?: number
  /** Écart entre la répétition la plus lente et la plus rapide (s). */
  spread?: number
  /** Chronos de chaque répétition du premier bloc. */
  splits?: number[]
  /** Allure de la séance entière pour une séance sans blocs (s/km). */
  sessionPace?: number
}

export function metrics(s: Session): Metrics {
  const b = s.blocks?.[0]
  if (b) {
    const splits = b.splits?.length ? b.splits : undefined
    return {
      avgRep: avgRepTime(b),
      pace: blockPace(b),
      best: splits ? Math.min(...splits) : undefined,
      worst: splits ? Math.max(...splits) : undefined,
      spread: splits ? Math.max(...splits) - Math.min(...splits) : undefined,
      splits,
    }
  }
  const d = sessionDistance(s)
  return { sessionPace: d && s.duration ? (s.duration / d) * 1000 : undefined }
}
