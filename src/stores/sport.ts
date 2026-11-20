/**
 * État de l'app, connexion et seules opérations d'écriture.
 *
 * Chaque action modifie d'abord l'état affiché (l'écran réagit tout de suite), puis l'enregistre via le backend :
 * Supabase si les variables d'environnement sont présentes, sinon le navigateur (mode démo).
 * En cas d'échec, on prévient et on recharge l'état depuis la base.
 */
import { reactive, ref } from 'vue'
import type { Session as AuthSession } from '@supabase/supabase-js'
import type { PlanEntry, Program, Session, SportData } from '../domain/types'
import { newId, sampleData, defaultPrograms } from '../data/seed'
import { emptyData, loadLocal, localBackend, supabaseBackend, type Backend } from '../data/backend'
import { supabase } from '../lib/supabase'
import { useToast } from '../composables/useToast'

/** true quand l'app est reliée à Supabase ; false en mode démo. */
export const isCloud = supabase !== null
export type Status = 'loading' | 'signed-out' | 'ready' | 'error'
export const status = ref<Status>('loading')
export const userEmail = ref<string | null>(null)

export const data = reactive<SportData>(emptyData())

let backend: Backend = localBackend(() => data)
let unsubscribe: (() => void) | null = null
let currentUserId: string | null = null
const { show } = useToast()

async function reload() {
  Object.assign(data, await backend.load())
}

/** Lance une écriture en arrière-plan ; si elle échoue, prévient et resynchronise. */
function save(op: () => Promise<void>) {
  op().catch(async (e: unknown) => {
    console.error(e)
    show('Pas enregistré : vérifie ta connexion', 'warn')
    try { await reload() } catch { /* hors ligne : on garde l'état affiché */ }
  })
}

async function onSession(session: AuthSession | null) {
  if (!supabase) return
  if (!session) {
    unsubscribe?.()
    unsubscribe = null
    currentUserId = null
    userEmail.value = null
    Object.assign(data, emptyData())
    status.value = 'signed-out'
    return
  }
  if (session.user.id === currentUserId) return // simple rafraîchissement du jeton
  currentUserId = session.user.id
  userEmail.value = session.user.email ?? null
  status.value = 'loading'
  try {
    backend = supabaseBackend(supabase, session.user.id)
    await reload()
    // Premier passage : on dépose les programmes types pour ne pas partir d'une page vide.
    if (!data.programs.length) for (const p of defaultPrograms()) sport.saveProgram(p)
    unsubscribe?.()
    unsubscribe = backend.subscribe(() => void reload().catch(console.error))
    status.value = 'ready'
  } catch (e) {
    console.error(e)
    currentUserId = null
    status.value = 'error'
  }
}

export function initStore() {
  if (!supabase) {
    Object.assign(data, loadLocal(sampleData))
    status.value = 'ready'
    return
  }
  // Ne pas appeler Supabase directement dans ce rappel : on repasse par la boucle d'évènements.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void onSession(session), 0)
  })
}

export const auth = {
  signIn() {
    return supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  },
  signOut() {
    return supabase?.auth.signOut()
  },
  retry() {
    void supabase?.auth.getSession().then(({ data: d }) => onSession(d.session))
  },
}

function upsert<T extends { id: string }>(list: T[], item: T): T {
  const i = list.findIndex((x) => x.id === item.id)
  if (i >= 0) list[i] = item
  else list.push(item)
  return item
}

export const sport = {
  /** Crée ou met à jour une séance ; renvoie son id. */
  saveSession(input: Omit<Session, 'id' | 'source'> & { id?: string; source?: Session['source'] }): string {
    const s: Session = { source: 'manuel', ...input, id: input.id ?? newId() }
    upsert(data.sessions, s)
    save(() => backend.saveSession(s))
    return s.id
  },
  deleteSession(id: string) {
    data.sessions = data.sessions.filter((x) => x.id !== id)
    // Le planning qui pointait sur cette séance redevient « à faire ».
    for (const p of data.plan) if (p.sessionId === id) {
      p.sessionId = null
      p.done = false
      save(() => backend.savePlan(p))
    }
    save(() => backend.deleteSession(id))
  },
  setFavorite(id: string, favorite: boolean, milestone?: string | null) {
    const s = data.sessions.find((x) => x.id === id)
    if (!s) return
    s.favorite = favorite
    s.milestone = favorite ? (milestone ?? s.milestone ?? null) : s.milestone
    save(() => backend.saveSession(s))
  },

  saveProgram(p: Program) {
    const saved = upsert(data.programs, { ...p })
    save(() => backend.saveProgram(saved))
  },
  deleteProgram(id: string) {
    data.programs = data.programs.filter((x) => x.id !== id)
    save(() => backend.deleteProgram(id))
  },

  savePlan(input: Omit<PlanEntry, 'id' | 'done'> & { id?: string; done?: boolean }) {
    const p: PlanEntry = { done: false, ...input, id: input.id ?? newId() }
    upsert(data.plan, p)
    save(() => backend.savePlan(p))
  },
  togglePlan(id: string, sessionId?: string | null) {
    const p = data.plan.find((x) => x.id === id)
    if (!p) return
    p.done = sessionId ? true : !p.done
    p.sessionId = sessionId ?? (p.done ? p.sessionId : null)
    save(() => backend.savePlan(p))
  },
  deletePlan(id: string) {
    data.plan = data.plan.filter((x) => x.id !== id)
    save(() => backend.deletePlan(id))
  },

  setVma(vma: number) {
    data.settings.vma = vma
    const s = { ...data.settings }
    save(() => backend.saveSettings(s))
  },

  /** Mode démo uniquement. */
  resetToSample() {
    if (isCloud) return
    Object.assign(data, sampleData())
    save(() => backend.saveSettings(data.settings))
  },
}
