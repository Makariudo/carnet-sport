/**
 * Où sont enregistrées les données : le navigateur (mode démo) ou Supabase.
 * Le store modifie d'abord l'état affiché, puis appelle le backend.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanEntry, Program, Session, Settings, SportData } from '../domain/types'

export interface Backend {
  load(): Promise<SportData>
  saveSession(s: Session): Promise<void>
  deleteSession(id: string): Promise<void>
  saveProgram(p: Program): Promise<void>
  deleteProgram(id: string): Promise<void>
  savePlan(p: PlanEntry): Promise<void>
  deletePlan(id: string): Promise<void>
  saveSettings(s: Settings): Promise<void>
  /** Écoute les changements faits depuis un autre appareil. Renvoie la fonction de désabonnement. */
  subscribe(onChange: () => void): () => void
}

export const emptyData = (): SportData => ({ v: 1, sessions: [], programs: [], plan: [], settings: { vma: 16 } })

// ---------------------------------------------------------------- Mode démo : localStorage

const KEY = 'mon-sport-v1'

export function loadLocal(fallback: () => SportData): SportData {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (d && d.v === 1) return d
  } catch { /* stockage indisponible : on repart des exemples */ }
  return fallback()
}

/** Chaque écriture réenregistre l'état complet, lu via `get`. */
export function localBackend(get: () => SportData): Backend {
  const save = async () => {
    try { localStorage.setItem(KEY, JSON.stringify(get())) } catch { /* ignoré */ }
  }
  return {
    load: async () => get(),
    saveSession: save, deleteSession: save, saveProgram: save, deleteProgram: save,
    savePlan: save, deletePlan: save, saveSettings: save,
    subscribe: () => () => {},
  }
}

// ---------------------------------------------------------------- Supabase

const TABLES = ['sessions', 'programs', 'plan_entries', 'settings'] as const

/** Les colonnes reprennent les champs en snake_case ; les blocs et exercices sont stockés en JSON. */
const sessionRow = (s: Session, userId: string) => ({
  id: s.id, owner_id: userId, date: s.date, sport: s.sport, kind: s.kind ?? null, title: s.title ?? null,
  distance: s.distance ?? null, duration: s.duration ?? null, elevation: s.elevation ?? null, rpe: s.rpe ?? null,
  notes: s.notes ?? null, blocks: s.blocks ?? null, ppg: s.ppg ?? null, program_id: s.programId ?? null,
  favorite: !!s.favorite, milestone: s.milestone ?? null, source: s.source, external_id: s.externalId ?? null,
})

type Row = Record<string, unknown>
const n = (v: unknown) => (v == null ? null : Number(v))

function toSession(r: Row): Session {
  return {
    id: r.id as string, date: r.date as string, sport: r.sport as Session['sport'], kind: r.kind as string | null,
    title: r.title as string | null, distance: n(r.distance), duration: n(r.duration), elevation: n(r.elevation),
    rpe: n(r.rpe), notes: r.notes as string | null, blocks: (r.blocks as Session['blocks']) ?? undefined,
    ppg: (r.ppg as Session['ppg']) ?? undefined, programId: r.program_id as string | null, favorite: !!r.favorite,
    milestone: r.milestone as string | null, source: r.source as Session['source'], externalId: r.external_id as string | null,
  }
}

export function supabaseBackend(sb: SupabaseClient, userId: string): Backend {
  const check = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message)
    return res.data
  }

  return {
    async load() {
      const [ses, prg, pln, set] = await Promise.all([
        sb.from('sessions').select('*').order('date'),
        sb.from('programs').select('id, name, items, transition, rounds').order('name'),
        sb.from('plan_entries').select('id, date, sport, label, program_id, session_id, done').order('date'),
        sb.from('settings').select('vma').maybeSingle(),
      ])
      const d = emptyData()
      d.sessions = (check(ses) ?? []).map(toSession)
      d.programs = (check(prg) ?? []).map((p) => ({
        id: p.id, name: p.name, items: p.items ?? [], transition: p.transition, rounds: p.rounds,
      }))
      d.plan = (check(pln) ?? []).map((p) => ({
        id: p.id, date: p.date, sport: p.sport, label: p.label, programId: p.program_id, sessionId: p.session_id, done: p.done,
      }))
      const st = check(set)
      if (st) d.settings = { vma: Number(st.vma) }
      return d
    },
    async saveSession(s) {
      check(await sb.from('sessions').upsert(sessionRow(s, userId)))
    },
    async deleteSession(id) {
      check(await sb.from('sessions').delete().eq('id', id))
    },
    async saveProgram(p) {
      check(await sb.from('programs').upsert({ id: p.id, owner_id: userId, name: p.name, items: p.items, transition: p.transition, rounds: p.rounds }))
    },
    async deleteProgram(id) {
      check(await sb.from('programs').delete().eq('id', id))
    },
    async savePlan(p) {
      check(await sb.from('plan_entries').upsert({
        id: p.id, owner_id: userId, date: p.date, sport: p.sport, label: p.label,
        program_id: p.programId ?? null, session_id: p.sessionId ?? null, done: p.done,
      }))
    },
    async deletePlan(id) {
      check(await sb.from('plan_entries').delete().eq('id', id))
    },
    async saveSettings(s) {
      check(await sb.from('settings').upsert({ owner_id: userId, vma: s.vma }))
    },
    subscribe(onChange) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const debounced = () => { clearTimeout(timer); timer = setTimeout(onChange, 300) }
      let channel = sb.channel(`sport-${userId}`)
      // Les règles d'accès limitent déjà ce qui est reçu ; chaque évènement déclenche juste un rechargement.
      for (const table of TABLES) channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, debounced)
      channel.subscribe()
      return () => { clearTimeout(timer); sb.removeChannel(channel) }
    },
  }
}
