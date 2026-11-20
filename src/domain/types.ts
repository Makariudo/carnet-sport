/** Sports suivis. Le home trainer est compté avec le vélo dans les stats « vélo » mais reste distinct à la saisie. */
export type Sport = 'course' | 'velo' | 'home-trainer' | 'natation' | 'ppg'
export const SPORTS: Sport[] = ['course', 'velo', 'home-trainer', 'natation', 'ppg']

/** D'où vient une séance : saisie à la main, ou plus tard importée d'une montre. */
export type Source = 'manuel' | 'polar' | 'garmin' | 'coros' | 'strava'

/** Un bloc de répétitions : « 10 x 1000 m en 3'05, récup 1'30 ». */
export interface Block {
  reps: number
  /** Distance d'une répétition en mètres (fractionné sur distance). */
  distance?: number
  /** Durée d'une répétition en secondes (fractionné sur temps, ex. 30/30). */
  duration?: number
  /** Temps visé ou moyen d'une répétition, en secondes (blocs sur distance). */
  repTime?: number
  /** Récupération entre répétitions : en secondes… */
  recovery?: number
  /** … ou en mètres (récup trottinée sur distance). */
  recoveryDistance?: number
  /** Temps réel de chaque répétition, en secondes, si saisis. */
  splits?: number[]
}

/** Un exercice de PPG dans une séance ou un programme. */
export interface PpgItem {
  /** Nom affiché, modifiable (« Demi-squat chargé », « Fentes marchées »…). */
  exercise: string
  /** Exercice de la bibliothèque d'origine, pour le schéma et les consignes. */
  exerciseId?: string
  sets: number
  /** Répétitions par série (exercice compté)… */
  reps?: number
  /** … ou durée d'effort par série en secondes (exercice minuté, ex. gainage). */
  duration?: number
  /** Récupération entre séries, en secondes. */
  rest?: number
  /** Charge en kg. */
  load?: number
}

export interface Session {
  id: string
  date: string
  sport: Sport
  /** Type de séance : footing, fractionné, sortie longue… (dépend du sport). */
  kind?: string | null
  title?: string | null
  /** Distance totale en mètres. */
  distance?: number | null
  /** Durée totale en secondes. */
  duration?: number | null
  elevation?: number | null
  /** Ressenti de 1 (très facile) à 10 (maximal). */
  rpe?: number | null
  notes?: string | null
  blocks?: Block[]
  ppg?: PpgItem[]
  programId?: string | null
  /** Séance marquée comme jalon (favori). */
  favorite?: boolean
  /** Ce que marque le jalon : « Premier 10x1000 sous 3'05 ». */
  milestone?: string | null
  source: Source
  externalId?: string | null
}

/** Programme type de PPG, relançable en un geste et jouable avec le minuteur. */
export interface Program {
  id: string
  name: string
  items: PpgItem[]
  /** Pause entre deux exercices, en secondes. */
  transition: number
  /** Nombre de tours du circuit. */
  rounds: number
}

/** Séance prévue dans le planning de la semaine. */
export interface PlanEntry {
  id: string
  date: string
  sport: Sport
  label: string
  programId?: string | null
  /** Séance réalisée qui coche cette entrée. */
  sessionId?: string | null
  done: boolean
}

export interface Settings {
  /** Vitesse maximale aérobie en km/h. */
  vma: number
}

export interface SportData {
  v: 1
  sessions: Session[]
  programs: Program[]
  plan: PlanEntry[]
  settings: Settings
}

/** Types de séance proposés à la saisie, par sport. */
export const KINDS: Record<Sport, string[]> = {
  course: ['Footing', 'Fractionné', 'Seuil', 'Sortie longue', 'Côtes', 'Compétition', 'Récup'],
  velo: ['Sortie', 'Sortie longue', 'Intervalles', 'Récup', 'Vélotaf'],
  'home-trainer': ['Endurance', 'Intervalles', 'Sweet spot', 'Récup'],
  natation: ['Technique', 'Endurance', 'Intervalles', 'Eau libre'],
  ppg: ['Renfo', 'Gainage', 'Circuit', 'Mobilité', 'Étirements'],
}

/** Types de séance qui ouvrent la saisie de blocs structurés. */
export const STRUCTURED_KINDS = ['Fractionné', 'Côtes', 'Intervalles', 'Seuil', 'Sweet spot']
