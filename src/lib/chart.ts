/** Une courbe d'un graphique à plusieurs séries. */
export interface Series {
  label: string
  /** Couleur CSS (variable de thème). */
  color: string
  values: number[]
  /** Axe utilisé : gauche par défaut, droite pour la seconde unité. */
  axis?: 'left' | 'right'
}

function niceStep(range: number, n: number): number {
  const raw = range / n
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

/** Graduations « rondes » couvrant [min, max]. */
export function ticks(min: number, max: number, n = 4): number[] {
  const st = niceStep(max - min || 1, n)
  const a = Math.floor(min / st) * st
  const b = Math.ceil(max / st) * st
  const t: number[] = []
  for (let v = a; v <= b + st / 2; v += st) t.push(Math.round(v * 1000) / 1000)
  return t
}
