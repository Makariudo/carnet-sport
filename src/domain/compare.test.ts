import { describe, expect, it } from 'vitest'
import { groupFavorites, groupLabel, sameWorkout } from './compare'
import type { Block, Session } from './types'

let n = 0
const run = (date: string, blocks: Block[]): Session => ({
  id: `s${++n}`, date, sport: 'course', kind: 'fractionné', blocks, favorite: true, source: 'manuel',
})
const k1000 = (reps: number, recovery?: number): Block => ({ reps, distance: 1000, recovery })

describe('sameWorkout', () => {
  it('même forme, récup proche (20 s ou 25 %) : même séance', () => {
    expect(sameWorkout(run('2026-11-01', [k1000(8, 90)]), run('2026-11-08', [k1000(8, 110)]))).toBe(true)
    expect(sameWorkout(run('2026-11-01', [k1000(5, 180)]), run('2026-11-08', [k1000(5, 220)]))).toBe(true)
    const r400 = (reps: number, recovery: number): Block => ({ reps, distance: 400, recovery })
    expect(sameWorkout(run('2026-11-01', [r400(10, 50)]), run('2026-11-08', [r400(15, 70)]))).toBe(true)
  })
  it('récup trop différente : séances distinctes', () => {
    expect(sameWorkout(run('2026-11-01', [k1000(8, 50)]), run('2026-11-08', [k1000(8, 90)]))).toBe(false)
    expect(sameWorkout(run('2026-11-01', [k1000(8, 90)]), run('2026-11-08', [k1000(8, 125)]))).toBe(false)
  })
  it('nombre de répétitions différent, même récup : comparables (8×1000 / 10×1000)', () => {
    expect(sameWorkout(run('2026-11-01', [k1000(8, 90)]), run('2026-11-08', [k1000(10, 90)]))).toBe(true)
  })
  it('6×1000 r50" et 8×1000 r1\'30 : distincts, à cause de la récup', () => {
    expect(sameWorkout(run('2026-11-01', [k1000(6, 50)]), run('2026-11-08', [k1000(8, 90)]))).toBe(false)
  })
  it('distance de répétition différente : séances distinctes', () => {
    expect(sameWorkout(run('2026-11-01', [k1000(8, 90)]), run('2026-11-08', [{ reps: 8, distance: 800, recovery: 90 }]))).toBe(false)
  })
  it('récup saisie d\'un côté seulement, ou en mètres contre secondes : séances distinctes', () => {
    expect(sameWorkout(run('2026-11-01', [k1000(8)]), run('2026-11-08', [k1000(8, 90)]))).toBe(false)
    const trot = run('2026-11-08', [{ reps: 8, distance: 1000, recoveryDistance: 200 }])
    expect(sameWorkout(run('2026-11-01', [k1000(8, 90)]), trot)).toBe(false)
  })
})

describe('groupFavorites', () => {
  it('sépare les 1000 selon la récup, mêle 8 et 10 répétitions, ancre chaque groupe sur le jalon le plus récent', () => {
    const groups = groupFavorites([
      run('2026-10-01', [k1000(8, 90)]),
      run('2026-10-15', [k1000(6, 50)]),
      run('2026-11-01', [k1000(10, 95)]),
      run('2026-11-10', [k1000(8, 100)]),
    ])
    expect(groups.map((g) => [g.label, g.sessions.length])).toEqual([
      ["1000 m · r 1'40", 3],
      ['1000 m · r 50"', 1],
    ])
    expect(new Set(groups.map((g) => g.key)).size).toBe(2)
  })
  it('libellé sans récup quand elle n\'est pas saisie', () => {
    expect(groupLabel(run('2026-11-01', [k1000(6)]))).toBe('1000 m')
  })
})
