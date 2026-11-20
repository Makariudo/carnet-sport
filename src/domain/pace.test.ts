import { describe, expect, it } from 'vitest'
import {
  DISTANCES, estimateVma, findDistance, fmtRaceTime, generatePaces, intensityColor, paceIntensity,
  percentVma, splitLabel, splitsOf, timeAtPace, vmaPace,
} from './pace'

const d10 = findDistance('10km')!

describe('generatePaces', () => {
  it('descend de la plus lente à la plus rapide', () => {
    expect(generatePaces(420, 360, 15)).toEqual([420, 405, 390, 375, 360])
  })
  it('ajoute la borne rapide quand le pas ne tombe pas dessus', () => {
    expect(generatePaces(400, 370, 25)).toEqual([400, 375, 370])
  })
  it("borne entre 2'00 et 9'00", () => {
    const p = generatePaces(600, 60, 30)
    expect(p[0]).toBe(540)
    expect(p[p.length - 1]).toBe(120)
  })
  it('renvoie [] si la plage est incohérente', () => {
    expect(generatePaces(300, 360, 15)).toEqual([])
    expect(generatePaces(420, 360, 0)).toEqual([])
    expect(generatePaces(100, 90, 5)).toEqual([])
    expect(generatePaces(700, 600, 5)).toEqual([])
  })
  it('une seule ligne si les bornes sont égales', () => {
    expect(generatePaces(300, 300, 10)).toEqual([300])
  })
})

describe('temps et formats', () => {
  it('temps à une allure', () => {
    expect(timeAtPace(10000, 300)).toBe(3000)
    expect(timeAtPace(400, 240)).toBeCloseTo(96)
    expect(timeAtPace(400, 0)).toBeNaN()
  })
  it('formate les temps', () => {
    expect(fmtRaceTime(96)).toBe('01:36')
    expect(fmtRaceTime(3725)).toBe('1:02:05')
    expect(fmtRaceTime(59.6)).toBe('01:00')
    expect(fmtRaceTime(NaN)).toBe('--:--')
    expect(fmtRaceTime(0)).toBe('--:--')
  })
  it('libellés de points de passage', () => {
    expect(splitLabel(400)).toBe('400 m')
    expect(splitLabel(5000)).toBe('5 km')
    expect(splitLabel(21097).replace(/\s/g, ' ')).toBe('21,1 km')
  })
})

describe('table des distances', () => {
  it('le semi fait 21097,5 m à 79-86 %', () => {
    const semi = findDistance('semi')!
    expect(semi.meters).toBe(21097.5)
    expect([semi.minSoutien, semi.maxSoutien]).toEqual([79, 86])
    expect(semi.splits[semi.splits.length - 1]).toBe(21097)
  })
  it('clés uniques et points de passage sans doublon', () => {
    expect(new Set(DISTANCES.map((d) => d.key)).size).toBe(DISTANCES.length)
    for (const d of DISTANCES) expect(splitsOf(d).length).toBe(new Set(d.splits).size)
  })
  it('points de passage cohérents', () => {
    expect(findDistance('marathon')!.splits[8]).toBe(42195)
    expect(d10.splits).toHaveLength(10)
    expect(findDistance('5000m')!.splits).toHaveLength(25)
  })
})

describe('VMA', () => {
  it('allure et %VMA', () => {
    expect(vmaPace(15)).toBe(240)
    expect(percentVma(240, 15)).toBeCloseTo(100)
    expect(percentVma(300, 15)).toBeCloseTo(80)
    expect(percentVma(240, 0)).toBeNaN()
  })
  it('estime la VMA depuis une course', () => {
    // 10 km en 40'00 : 15 km/h, milieu de bande 87,5 %
    expect(estimateVma(d10, 2400)).toBeCloseTo(15 / 0.875)
    // 5 km en 20'00 : 15 km/h, milieu 92,5 %
    expect(estimateVma(findDistance('5000m')!, 1200)).toBeCloseTo(15 / 0.925)
    expect(estimateVma(d10, 0)).toBeNaN()
  })
})

describe('intensité', () => {
  const vma = 18 // allure VMA 200 s/km ; bande 10 km : 84-91 %
  const fast = 200 / 0.91
  const slow = 200 / 0.84
  it('1 au bord rapide, 0 au bord lent, null en dehors', () => {
    expect(paceIntensity(fast, vma, d10)).toBeCloseTo(1)
    expect(paceIntensity(slow, vma, d10)).toBeCloseTo(0)
    expect(paceIntensity((fast + slow) / 2, vma, d10)).toBeCloseTo(0.5)
    expect(paceIntensity(fast - 5, vma, d10)).toBeNull()
    expect(paceIntensity(slow + 5, vma, d10)).toBeNull()
  })
  it('dégradé sans distance, borné', () => {
    expect(paceIntensity(100, vma)).toBe(1)
    expect(paceIntensity(600, vma)).toBe(0)
    const mid = paceIntensity(300, vma)!
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })
  it('null si VMA invalide', () => {
    expect(paceIntensity(300, 0, d10)).toBeNull()
    expect(paceIntensity(300, NaN)).toBeNull()
  })
  it('couleur CSS', () => {
    expect(intensityColor(null)).toBe('')
    expect(intensityColor(0)).toContain('var(--pos)')
    expect(intensityColor(1)).toContain('var(--neg)')
  })
})
