/** Données d'exemple du mode démo, recalées sur la date du jour. */
import type { PlanEntry, Program, Session, SportData } from '../domain/types'
import { addDays, todayISO, weekStart } from '../lib/dates'

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

/** Programmes types proposés au départ (modifiables). */
export function defaultPrograms(): Program[] {
  return [
    {
      id: newId(), name: 'Gainage 15 min', rounds: 2, transition: 15,
      items: [
        { exercise: 'Planche', sets: 1, duration: 45 },
        { exercise: 'Planche latérale gauche', sets: 1, duration: 30 },
        { exercise: 'Planche latérale droite', sets: 1, duration: 30 },
        { exercise: 'Superman', sets: 1, duration: 30 },
        { exercise: 'Hollow body', sets: 1, duration: 30 },
      ],
    },
    {
      id: newId(), name: 'Renfo coureur', rounds: 1, transition: 30,
      items: [
        { exercise: 'Squats', sets: 3, reps: 15, rest: 30 },
        { exercise: 'Fentes alternées', sets: 3, reps: 12, rest: 30 },
        { exercise: 'Pont fessier unipodal', sets: 3, reps: 10, rest: 30 },
        { exercise: 'Montées sur pointes', sets: 3, reps: 20, rest: 30 },
        { exercise: 'Chaise', sets: 2, duration: 45, rest: 30 },
      ],
    },
    {
      id: newId(), name: 'Circuit 30/30', rounds: 3, transition: 10,
      items: [
        { exercise: 'Burpees', sets: 1, duration: 30, rest: 30 },
        { exercise: 'Skipping', sets: 1, duration: 30, rest: 30 },
        { exercise: 'Pompes', sets: 1, duration: 30, rest: 30 },
        { exercise: 'Mountain climbers', sets: 1, duration: 30, rest: 30 },
      ],
    },
  ]
}

export function sampleData(): SportData {
  const today = todayISO()
  const programs = defaultPrograms()
  const sessions: Session[] = []
  const add = (daysAgo: number, s: Omit<Session, 'id' | 'date' | 'source'>) =>
    sessions.push({ id: newId(), date: addDays(today, -daysAgo), source: 'manuel', ...s })

  // 12 semaines de course qui montent doucement en charge, avec vélo, natation et PPG.
  for (let w = 11; w >= 0; w--) {
    const base = w * 7
    const k = 1 + (11 - w) * 0.03
    add(base + 6, { sport: 'course', kind: 'Footing', distance: Math.round(9000 * k), duration: Math.round(2900 * k), rpe: 3 })
    add(base + 4, {
      sport: 'course', kind: 'Fractionné', distance: 12000, duration: 3600, rpe: 8,
      blocks: [{ reps: 10, distance: 1000, repTime: Math.round(194 - (11 - w) * 0.8), recovery: 90 }],
    })
    add(base + 1, { sport: 'course', kind: 'Sortie longue', distance: Math.round(16000 * k), duration: Math.round(5300 * k), rpe: 5 })
    if (w % 2 === 0) add(base + 3, { sport: 'velo', kind: 'Sortie', distance: 52000, duration: 6300, elevation: 600, rpe: 4 })
    else add(base + 3, { sport: 'home-trainer', kind: 'Intervalles', distance: 28000, duration: 3600, rpe: 7 })
    if (w % 3 === 0) add(base + 2, { sport: 'natation', kind: 'Endurance', distance: 2000, duration: 2700, rpe: 4 })
    add(base + 5, { sport: 'ppg', kind: 'Renfo', duration: 1500, programId: programs[1].id, ppg: programs[1].items, rpe: 5 })
  }

  // Deux jalons sur le 10x1000 pour la comparaison.
  const intervals = sessions.filter((s) => s.kind === 'Fractionné')
  const first = intervals[0], last = intervals[intervals.length - 1]
  first.favorite = true
  first.milestone = 'Premier 10x1000 complet'
  first.blocks![0].splits = [192, 193, 194, 194, 195, 195, 194, 196, 195, 193]
  last.favorite = true
  last.milestone = '10x1000 en 3\'05'
  last.blocks![0].repTime = 185
  last.blocks![0].splits = [186, 185, 185, 184, 186, 185, 185, 184, 185, 183]

  const mon = weekStart(today)
  const plan: PlanEntry[] = [
    { id: newId(), date: mon, sport: 'course', label: 'Footing 45\'', done: false },
    { id: newId(), date: addDays(mon, 1), sport: 'course', label: '10x1000 r1\'30', done: false },
    { id: newId(), date: addDays(mon, 2), sport: 'ppg', label: programs[0].name, programId: programs[0].id, done: false },
    { id: newId(), date: addDays(mon, 3), sport: 'home-trainer', label: 'Sweet spot 3x12\'', done: false },
    { id: newId(), date: addDays(mon, 5), sport: 'course', label: 'Sortie longue 1h30', done: false },
    { id: newId(), date: addDays(mon, 6), sport: 'natation', label: 'Natation 2 km', done: false },
  ]
  for (const p of plan) if (p.date < today) p.done = true

  return { v: 1, sessions, programs, plan, settings: { vma: 18 } }
}
