/**
 * Bibliothèque d'exercices de PPG pensée pour la course de demi-fond et de fond (3000 m → marathon) :
 * gainage, force des membres inférieurs, pieds-chevilles, pliométrie et éducatifs, hanches, haut du corps
 * (balancier), mobilité. Chaque exercice a un réglage proposé, des consignes d'exécution et un schéma animé.
 */
import { pose, STAND, type Figure, type Pose } from './figure'
import type { PpgItem } from './types'

export type Category = 'gainage' | 'force' | 'pieds' | 'plio' | 'hanches' | 'haut' | 'mobilite'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'gainage', label: 'Gainage' },
  { id: 'force', label: 'Force jambes' },
  { id: 'pieds', label: 'Pieds-chevilles' },
  { id: 'plio', label: 'Pliométrie' },
  { id: 'hanches', label: 'Hanches' },
  { id: 'haut', label: 'Haut du corps' },
  { id: 'mobilite', label: 'Mobilité' },
]

export interface Exercise {
  id: string
  name: string
  /** Autres noms reconnus (anciens programmes, variantes d'écriture). */
  aliases?: string[]
  category: Category
  /** Réglage proposé à l'ajout dans un programme. */
  defaults: Omit<PpgItem, 'exercise' | 'exerciseId'>
  /** Se fait avec une charge (haltères, barre, kettlebell). */
  loadable?: boolean
  /** Se fait côté par côté : le nombre indiqué vaut pour chaque côté. */
  perSide?: boolean
  /** Comment le faire, en 2 à 4 consignes. */
  cues: string[]
  /** Pourquoi c'est utile au coureur. */
  why: string
  figure: Figure
}

// ---------------------------------------------------------------- Poses de base réutilisées

const ANKLE: [number, number] = [100, 146]

const SQUAT_DOWN = pose({ t: 35, rt: 78, rs: -28, lt: 78, ls: -28, ra: 80, rfa: 88, la: 80, lfa: 88 })
const HALF_SQUAT = pose({ t: 25, rt: 55, rs: -22, lt: 55, ls: -22, ra: 70, rfa: 85, la: 70, lfa: 85 })
/** Mains qui tiennent une barre sur les épaules. */
const BAR_ARMS = { ra: -35, rfa: 150, la: -35, lfa: 150 }
/** Mains qui tiennent un haltère contre la poitrine. */
const GOBLET_ARMS = { ra: 25, rfa: 165, la: 25, lfa: 165 }
const ARMS_DOWN = { ra: 4, rfa: 4, la: -4, lfa: -4 }

/** Fente : pied avant (côté proche) devant, genou arrière vers le sol. */
const LUNGE_UP = pose({ t: 4, rt: 31, rs: 31, lt: -31, ls: -31, lf: 60, ...ARMS_DOWN })
const LUNGE_DOWN = pose({ t: 4, rt: 85, rs: -5, lt: -10, ls: -85, lf: 30, ...ARMS_DOWN })
/** Même fente, jambes inversées (pied éloigné devant). */
const swapLegs = (p: Pose): Pose => ({ ...p, rt: p.lt, rs: p.ls, rf: p.lf, lt: p.rt, ls: p.rs, lf: p.rf })
const swapArms = (p: Pose): Pose => ({ ...p, ra: p.la, rfa: p.lfa, la: p.ra, lfa: p.rfa })

/** Gainage sur les avant-bras : coude proche posé au sol. */
const PLANK = pose({ t: 78, rt: -78, rs: -78, rf: 10, lt: -78, ls: -78, lf: 10, ra: 0, rfa: 90, la: 0, lfa: 90 })
/** Planche bras tendus : main proche au sol. */
const HIGH_PLANK = pose({ t: 66, rt: -66, rs: -66, rf: 20, lt: -66, ls: -66, lf: 20, ra: 0, rfa: 0, la: 0, lfa: 0 })
const PUSHUP_DOWN = pose({ t: 78, rt: -78, rs: -78, rf: 15, lt: -78, ls: -78, lf: 15, ra: -70, rfa: 40, la: -70, lfa: 40 })

/** Allongé sur le dos, tête à gauche, genoux fléchis pieds au sol. */
const BRIDGE_DOWN = pose({ t: -90, rt: 130, rs: 30, lt: 130, ls: 30, ra: 90, rfa: 90, la: 90, lfa: 90 })
const BRIDGE_UP = pose({ t: -119, rt: 100, rs: 5, lt: 100, ls: 5, ra: 90, rfa: 90, la: 90, lfa: 90 })

/** Course sur place : genou proche levé, bras opposés. */
const RUN_A = pose({ t: 6, rt: 85, rs: 5, rf: 70, lt: -4, ls: -4, lf: 55, ra: -40, rfa: 40, la: 55, lfa: 140 })

const still = (p: Pose, seconds = 1.2): Figure['frames'] => [{ pose: p, hold: seconds }, { pose: p, move: 0.01, hold: seconds }]

// ---------------------------------------------------------------- Bibliothèque

export const EXERCISES: Exercise[] = [
  // ---------------- Gainage
  {
    id: 'planche', name: 'Planche', aliases: ['Gainage ventral', 'Planche frontale'], category: 'gainage',
    defaults: { sets: 3, duration: 45, rest: 20 },
    cues: ['Coudes sous les épaules, avant-bras au sol', 'Corps aligné des épaules aux chevilles, fessiers serrés', 'Nombril rentré, on respire sans creuser le dos'],
    why: 'Un tronc solide garde la foulée efficace quand la fatigue arrive.',
    figure: { anchor: 'rElbow', at: [150, 146], frames: still(PLANK) },
  },
  {
    id: 'planche-laterale', name: 'Planche latérale', aliases: ['Planche latérale gauche', 'Planche latérale droite', 'Gainage latéral'], category: 'gainage',
    defaults: { sets: 2, duration: 30, rest: 15 }, perSide: true,
    cues: ['Coude sous l\'épaule, pieds empilés', 'Bassin haut, corps en ligne', 'Main libre sur la hanche ou vers le plafond'],
    why: 'Stabilise le bassin à chaque appui : moins de bascule, moins de genou qui rentre.',
    figure: { anchor: 'rElbow', at: [150, 146], frames: still(pose({ la: 175, lfa: 178 }, PLANK)) },
  },
  {
    id: 'planche-laterale-abduction', name: 'Planche latérale avec levée de jambe', category: 'gainage',
    defaults: { sets: 2, reps: 10, rest: 20 }, perSide: true,
    cues: ['Position de planche latérale, bassin haut', 'Monter la jambe du dessus tendue, pied flex', 'Redescendre lentement sans laisser tomber le bassin'],
    why: 'Renforce le moyen fessier, clé de la stabilité du genou en course.',
    figure: { anchor: 'rElbow', at: [150, 146], frames: [{ pose: pose({ la: 175, lfa: 178 }, PLANK) }, { pose: pose({ la: 175, lfa: 178, lt: -112, ls: -112 }, PLANK) }] },
  },
  {
    id: 'dead-bug', name: 'Dead bug', category: 'gainage',
    defaults: { sets: 3, reps: 10, rest: 20 },
    cues: ['Sur le dos, bras vers le plafond, hanches et genoux à 90°', 'Tendre un bras et la jambe opposée sans décoller le bas du dos', 'Revenir et changer de côté, lentement'],
    why: 'Apprend à garder le bassin stable pendant que bras et jambes bougent, comme en course.',
    figure: {
      anchor: 'hip', at: [105, 140],
      frames: [
        { pose: pose({ t: -90, rt: 180, rs: 90, lt: 180, ls: 90, ra: 180, rfa: 180, la: 180, lfa: 180 }) },
        { pose: pose({ t: -90, rt: 180, rs: 90, lt: 95, ls: 95, ra: -95, rfa: -95, la: 180, lfa: 180 }), move: 1.1, hold: 0.4 },
        { pose: pose({ t: -90, rt: 180, rs: 90, lt: 180, ls: 90, ra: 180, rfa: 180, la: 180, lfa: 180 }), move: 1.1 },
        { pose: pose({ t: -90, rt: 95, rs: 95, lt: 180, ls: 90, ra: 180, rfa: 180, la: -95, lfa: -95 }), move: 1.1, hold: 0.4 },
      ],
    },
  },
  {
    id: 'bird-dog', name: 'Bird dog', aliases: ['Quadrupédie bras-jambe opposés'], category: 'gainage',
    defaults: { sets: 3, reps: 10, rest: 20 }, perSide: true,
    cues: ['À quatre pattes, mains sous les épaules, genoux sous les hanches', 'Tendre un bras devant et la jambe opposée derrière', 'Dos plat, bassin immobile, tenir 2 s'],
    why: 'Gainage croisé : la même chaîne que le balancier bras-jambe de la foulée.',
    figure: {
      anchor: 'rKnee', at: [80, 146],
      frames: [
        { pose: pose({ t: 80, rt: 0, rs: -90, rf: -90, lt: 0, ls: -90, lf: -90, ra: 0, rfa: 0, la: 0, lfa: 0 }) },
        { pose: pose({ t: 80, rt: 0, rs: -90, rf: -90, lt: -92, ls: -92, lf: 0, ra: 95, rfa: 95, la: 0, lfa: 0 }), move: 1, hold: 1 },
      ],
    },
  },
  {
    id: 'hollow-body', name: 'Hollow body', aliases: ['Gainage creux'], category: 'gainage',
    defaults: { sets: 3, duration: 30, rest: 20 },
    cues: ['Sur le dos, bas du dos plaqué au sol', 'Jambes tendues et épaules décollées', 'Bras tendus derrière la tête, on tient en respirant'],
    why: 'Gainage antérieur profond, utile pour ne pas « s\'asseoir » en fin de course.',
    figure: {
      anchor: 'hip', at: [100, 144],
      frames: [
        { pose: pose({ t: -76, rt: 100, rs: 100, rf: 100, lt: 100, ls: 100, lf: 100, ra: -100, rfa: -100, la: -100, lfa: -100 }), hold: 0.6 },
        { pose: pose({ t: -80, rt: 96, rs: 96, rf: 96, lt: 96, ls: 96, lf: 96, ra: -96, rfa: -96, la: -96, lfa: -96 }), move: 1, hold: 0.6 },
      ],
    },
  },
  {
    id: 'superman', name: 'Superman', category: 'gainage',
    defaults: { sets: 3, duration: 30, rest: 20 },
    cues: ['À plat ventre, bras tendus devant', 'Décoller bras, buste et jambes en même temps', 'Regard vers le sol, nuque longue'],
    why: 'Renforce les lombaires et les fessiers qui tiennent la posture en fin de course.',
    figure: {
      anchor: 'hip', at: [95, 144],
      frames: [
        { pose: pose({ t: 90, rt: -90, rs: -90, rf: -20, lt: -90, ls: -90, lf: -20, ra: 90, rfa: 90, la: 90, lfa: 90 }) },
        { pose: pose({ t: 78, rt: -100, rs: -102, rf: -20, lt: -100, ls: -102, lf: -20, ra: 100, rfa: 102, la: 100, lfa: 102 }), move: 1, hold: 1 },
      ],
    },
  },
  {
    id: 'mountain-climbers', name: 'Mountain climbers', category: 'gainage',
    defaults: { sets: 3, duration: 30, rest: 30 },
    cues: ['Planche bras tendus, mains sous les épaules', 'Ramener un genou vers la poitrine puis l\'autre, vite', 'Le bassin reste bas et stable'],
    why: 'Gainage dynamique et cardio, avec le geste de montée de genou.',
    figure: {
      anchor: 'rWrist', at: [150, 147],
      frames: [
        { pose: pose({ rt: 55, rs: -75 }, HIGH_PLANK), move: 0.25, hold: 0.05 },
        { pose: pose({ lt: 55, ls: -75 }, HIGH_PLANK), move: 0.25, hold: 0.05 },
      ],
    },
  },

  // ---------------- Force des jambes
  {
    id: 'demi-squat', name: 'Demi-squat chargé', aliases: ['Demi-squat', 'Demi squat'], category: 'force',
    defaults: { sets: 4, reps: 8, rest: 90, load: 20 }, loadable: true,
    cues: ['Barre sur le haut du dos, pieds largeur de hanches', 'Descendre cuisses à 45°, genoux dans l\'axe des pieds', 'Remonter fort, dos droit, talons au sol'],
    why: 'La force maximale des jambes améliore l\'économie de course sans prise de masse.',
    figure: { anchor: 'rAnkle', at: ANKLE, frames: [{ pose: pose(BAR_ARMS) }, { pose: { ...HALF_SQUAT, ...BAR_ARMS }, move: 1, hold: 0.2 }], props: [{ kind: 'bar' }] },
  },
  {
    id: 'squat', name: 'Squat', aliases: ['Squats', 'Squat poids du corps'], category: 'force',
    defaults: { sets: 3, reps: 15, rest: 30 },
    cues: ['Pieds largeur d\'épaules, bras devant', 'Descendre comme pour s\'asseoir, poids sur les talons', 'Genoux dans l\'axe des pieds, dos droit'],
    why: 'La base du renforcement des quadriceps et des fessiers.',
    figure: { anchor: 'rAnkle', at: ANKLE, frames: [{ pose: pose({ ra: 80, rfa: 88, la: 80, lfa: 88 }) }, { pose: SQUAT_DOWN, move: 1 }] },
  },
  {
    id: 'squat-goblet', name: 'Squat goblet', category: 'force',
    defaults: { sets: 3, reps: 10, rest: 60, load: 12 }, loadable: true,
    cues: ['Haltère ou kettlebell tenu contre la poitrine', 'Descendre profond, coudes entre les genoux', 'Buste droit, talons au sol'],
    why: 'Squat chargé facile à apprendre, qui garde le buste droit.',
    figure: { anchor: 'rAnkle', at: ANKLE, frames: [{ pose: pose(GOBLET_ARMS) }, { pose: { ...SQUAT_DOWN, t: 20, ...GOBLET_ARMS }, move: 1 }], props: [{ kind: 'goblet' }] },
  },
  {
    id: 'squat-bulgare', name: 'Squat bulgare', aliases: ['Fente bulgare', 'Split squat bulgare'], category: 'force',
    defaults: { sets: 3, reps: 8, rest: 60, load: 8 }, loadable: true, perSide: true,
    cues: ['Pied arrière posé sur un banc, pied avant un grand pas devant', 'Descendre à la verticale, genou avant au-dessus du pied', 'Pousser dans le talon avant pour remonter'],
    why: 'Force unilatérale : corrige les déséquilibres entre les deux jambes.',
    figure: {
      anchor: 'rAnkle', at: [132, 146],
      frames: [
        { pose: pose({ t: 6, rt: 35, rs: 15, lt: -42, ls: -43, lf: 175, ...ARMS_DOWN }) },
        { pose: pose({ t: 8, rt: 80, rs: -8, lt: -20, ls: -95, lf: 175, ...ARMS_DOWN }), move: 1.1 },
      ],
      props: [{ kind: 'box', x: 22, w: 42, h: 16 }, { kind: 'dumbbells' }],
    },
  },
  {
    id: 'fentes-avant', name: 'Fentes', aliases: ['Fentes avant', 'Fentes alternées', 'Fente', 'Fentes arrière', 'Split squat'], category: 'force',
    defaults: { sets: 3, reps: 12, rest: 30 }, loadable: true, perSide: true,
    cues: ['Un grand pas, buste droit', 'Descendre le genou arrière près du sol', 'Genou avant au-dessus de la cheville, pousser pour remonter'],
    why: 'Travaille fessiers et quadriceps dans une position proche de la foulée.',
    figure: { anchor: 'rAnkle', at: [128, 146], frames: [{ pose: LUNGE_UP }, { pose: LUNGE_DOWN, move: 1 }] },
  },
  {
    id: 'step-up', name: 'Montée sur banc', aliases: ['Step-up', 'Step up'], category: 'force',
    defaults: { sets: 3, reps: 10, rest: 45, load: 8 }, loadable: true, perSide: true,
    cues: ['Pied entier sur un banc ou une marche haute', 'Monter en poussant sur la jambe du haut, pas sur celle du bas', 'Finir genou opposé levé, gainé'],
    why: 'Le geste de poussée de la course en côte, sur une jambe.',
    figure: {
      anchor: 'rAnkle', at: [125, 122],
      frames: [
        { pose: pose({ t: 12, rt: 70, rs: -10, lt: -12, ls: -12, ...ARMS_DOWN }) },
        { pose: pose({ t: 2, rt: 0, rs: 0, lt: 75, ls: -5, lf: 70, ra: -30, rfa: 30, la: 40, lfa: 120 }), move: 1, hold: 0.4 },
      ],
      props: [{ kind: 'box', x: 110, w: 60, h: 24 }],
    },
  },
  {
    id: 'souleve-roumain', name: 'Soulevé de terre roumain', aliases: ['RDL', 'Soulevé de terre jambes tendues'], category: 'force',
    defaults: { sets: 3, reps: 10, rest: 60, load: 20 }, loadable: true,
    cues: ['Charge devant les cuisses, genoux légèrement fléchis', 'Pousser les fesses en arrière, dos plat, charge près des jambes', 'Remonter en serrant les fessiers'],
    why: 'Renforce ischios et fessiers, les moteurs de la propulsion.',
    figure: { anchor: 'rAnkle', at: ANKLE, frames: [{ pose: pose(ARMS_DOWN) }, { pose: pose({ t: 78, rt: 12, rs: -6, lt: 12, ls: -6, ra: 0, rfa: 0, la: 0, lfa: 0 }), move: 1.2 }], props: [{ kind: 'dumbbells' }] },
  },
  {
    id: 'souleve-unipodal', name: 'Soulevé de terre unipodal', aliases: ['RDL unipodal', 'Single leg deadlift'], category: 'force',
    defaults: { sets: 3, reps: 8, rest: 45, load: 8 }, loadable: true, perSide: true,
    cues: ['Debout sur une jambe, genou souple', 'Basculer le buste en avant, jambe libre tendue derrière', 'Bassin de face, revenir en contrôlant'],
    why: 'Force et équilibre sur un appui, comme à chaque foulée.',
    figure: {
      anchor: 'rAnkle', at: [110, 146],
      frames: [
        { pose: pose({ lt: -8, ls: -8, ...ARMS_DOWN }) },
        { pose: pose({ t: 84, rt: 8, rs: -4, lt: -95, ls: -95, lf: 0, ra: 0, rfa: 0, la: 0, lfa: 0 }), move: 1.3 },
      ],
      props: [{ kind: 'dumbbells' }],
    },
  },
  {
    id: 'hip-thrust', name: 'Hip thrust', category: 'force',
    defaults: { sets: 3, reps: 10, rest: 60, load: 20 }, loadable: true,
    cues: ['Haut du dos sur un banc, pieds à plat', 'Monter le bassin jusqu\'à l\'alignement épaules-genoux', 'Serrer les fessiers en haut, menton rentré'],
    why: 'Le meilleur exercice pour les fessiers, moteurs de l\'extension de hanche.',
    figure: {
      anchor: 'rAnkle', at: [142, 146],
      frames: [
        { pose: pose({ t: -71, rt: 120, rs: -15, lt: 120, ls: -15, ra: 90, rfa: 90, la: 90, lfa: 90 }) },
        { pose: pose({ t: -95, rt: 95, rs: -10, lt: 95, ls: -10, ra: 90, rfa: 90, la: 90, lfa: 90 }), move: 1, hold: 0.5 },
      ],
      props: [{ kind: 'box', x: 30, w: 42, h: 36 }],
    },
  },
  {
    id: 'pont-fessier', name: 'Pont fessier', aliases: ['Pont', 'Relevé de bassin'], category: 'force',
    defaults: { sets: 3, reps: 15, rest: 30 },
    cues: ['Sur le dos, genoux fléchis, pieds à plat', 'Monter le bassin en poussant dans les talons', 'Tenir 1 s en haut, fessiers serrés'],
    why: 'Réveille les fessiers, souvent endormis chez le coureur assis toute la journée.',
    figure: { anchor: 'rAnkle', at: [132, 146], frames: [{ pose: BRIDGE_DOWN }, { pose: BRIDGE_UP, move: 0.9, hold: 0.6 }] },
  },
  {
    id: 'pont-unipodal', name: 'Pont fessier unipodal', category: 'force',
    defaults: { sets: 3, reps: 10, rest: 30 }, perSide: true,
    cues: ['Comme le pont, une jambe tendue en l\'air', 'Monter sans laisser le bassin pencher', 'Redescendre lentement'],
    why: 'Fessiers et ischios sur une jambe, avec contrôle du bassin.',
    figure: {
      anchor: 'rAnkle', at: [132, 146],
      frames: [{ pose: { ...BRIDGE_DOWN, lt: 135, ls: 120 } }, { pose: { ...BRIDGE_UP, lt: 112, ls: 112 }, move: 0.9, hold: 0.6 }],
    },
  },
  {
    id: 'chaise', name: 'Chaise', aliases: ['Wall sit', 'Chaise contre le mur'], category: 'force',
    defaults: { sets: 2, duration: 45, rest: 30 }, loadable: true,
    cues: ['Dos plaqué au mur', 'Cuisses horizontales, genoux au-dessus des chevilles', 'Tenir en respirant, sans pousser avec les mains'],
    why: 'Endurance de force des quadriceps, utile pour les descentes.',
    figure: { anchor: 'rAnkle', at: [122, 146], frames: still(pose({ rt: 90, rs: 0, lt: 90, ls: 0, ra: 20, rfa: 110, la: 20, lfa: 110 })), props: [{ kind: 'wall', x: 78 }] },
  },
  {
    id: 'nordic', name: 'Nordic hamstring', aliases: ['Nordic', 'Nordic curl'], category: 'force',
    defaults: { sets: 3, reps: 5, rest: 90 },
    cues: ['À genoux, chevilles bloquées par un partenaire ou un meuble', 'Descendre le corps droit le plus lentement possible', 'Se rattraper avec les mains, revenir en poussant'],
    why: 'Renforcement excentrique des ischios : la meilleure prévention de leurs blessures.',
    figure: {
      anchor: 'rKnee', at: [62, 146],
      frames: [
        { pose: pose({ t: 0, rt: 0, rs: -90, rf: -90, lt: 0, ls: -90, lf: -90, ra: 25, rfa: 120, la: 25, lfa: 120 }), hold: 0.5 },
        { pose: pose({ t: 62, rt: -62, rs: -90, rf: -90, lt: -62, ls: -90, lf: -90, ra: 40, rfa: 30, la: 40, lfa: 30 }), move: 2.4, hold: 0.3 },
      ],
    },
  },
  {
    id: 'squat-unipodal', name: 'Squat unipodal sur box', aliases: ['Pistol squat', 'Assis-debout unipodal'], category: 'force',
    defaults: { sets: 3, reps: 8, rest: 45 }, perSide: true,
    cues: ['Debout sur une jambe devant un banc', 'S\'asseoir lentement, l\'autre jambe tendue devant', 'Se relever sans élan, genou dans l\'axe'],
    why: 'Force et contrôle du genou sur une jambe.',
    figure: {
      anchor: 'rAnkle', at: [112, 146],
      frames: [
        { pose: pose({ t: 5, lt: 40, ls: 40, ra: 70, rfa: 80, la: 70, lfa: 80 }) },
        { pose: pose({ t: 30, rt: 85, rs: -20, lt: 85, ls: 92, ra: 80, rfa: 85, la: 80, lfa: 85 }), move: 1.4, hold: 0.3 },
      ],
      props: [{ kind: 'box', x: 46, w: 40, h: 38 }],
    },
  },

  // ---------------- Pieds-chevilles
  {
    id: 'montees-pointes', name: 'Montées sur pointes', aliases: ['Mollets', 'Extensions mollets', 'Élévations mollets'], category: 'pieds',
    defaults: { sets: 3, reps: 20, rest: 30 }, loadable: true,
    cues: ['Debout, pieds largeur de hanches', 'Monter le plus haut possible sur les pointes', 'Redescendre lentement, 2 à 3 s'],
    why: 'Mollets et tendon d\'Achille encaissent plusieurs fois le poids du corps à chaque foulée.',
    figure: { anchor: 'rToe', at: [111, 147], frames: [{ pose: pose(ARMS_DOWN) }, { pose: pose({ rf: 35, lf: 35, ...ARMS_DOWN }), move: 0.6, hold: 0.4 }] },
  },
  {
    id: 'mollets-marche', name: 'Mollets unipodal sur marche', aliases: ['Mollets excentriques', 'Mollet sur marche'], category: 'pieds',
    defaults: { sets: 3, reps: 12, rest: 30 }, loadable: true, perSide: true,
    cues: ['Avant du pied au bord d\'une marche, main au mur', 'Descendre le talon sous la marche, lentement', 'Remonter haut sur la pointe'],
    why: 'Le travail excentrique protège le tendon d\'Achille, très sollicité en course.',
    figure: {
      anchor: 'rToe', at: [112, 135],
      frames: [
        { pose: pose({ rf: 125, lt: -5, ls: -80, lf: -60, ra: 75, rfa: 85, la: 0, lfa: 0 }), hold: 0.3 },
        { pose: pose({ rf: 35, lt: -5, ls: -80, lf: -60, ra: 75, rfa: 85, la: 0, lfa: 0 }), move: 0.8, hold: 0.3 },
      ],
      props: [{ kind: 'box', x: 58, w: 52, h: 12 }, { kind: 'wall', x: 168 }],
    },
  },
  {
    id: 'mollets-genou-flechi', name: 'Mollets genou fléchi', aliases: ['Soléaire', 'Mollets soléaire'], category: 'pieds',
    defaults: { sets: 3, reps: 15, rest: 30 }, loadable: true,
    cues: ['Genoux fléchis, comme en début de squat', 'Monter sur les pointes sans tendre les genoux', 'Redescendre lentement'],
    why: 'Cible le soléaire, le muscle du mollet le plus sollicité en endurance.',
    figure: {
      anchor: 'rToe', at: [114, 147],
      frames: [{ pose: pose({ t: 12, rt: 40, rs: -25, lt: 40, ls: -25, ...ARMS_DOWN }) }, { pose: pose({ t: 12, rt: 40, rs: -25, rf: 35, lt: 40, ls: -25, lf: 35, ...ARMS_DOWN }), move: 0.6, hold: 0.4 }],
    },
  },
  {
    id: 'releve-pointes', name: 'Relevés de pointes', aliases: ['Releveurs', 'Tibial raise'], category: 'pieds',
    defaults: { sets: 3, reps: 20, rest: 30 },
    cues: ['Dos au mur, talons à 30 cm du mur', 'Relever les pointes de pied le plus haut possible', 'Redescendre sans claquer'],
    why: 'Renforce le jambier antérieur, contre les périostites.',
    figure: {
      anchor: 'rAnkle', at: [112, 146],
      frames: [{ pose: pose({ t: -10, rt: 16, rs: 16, lt: 16, ls: 16, ...ARMS_DOWN }) }, { pose: pose({ t: -10, rt: 16, rs: 16, rf: 140, lt: 16, ls: 16, lf: 140, ...ARMS_DOWN }), move: 0.5, hold: 0.3 }],
      props: [{ kind: 'wall', x: 82 }],
    },
  },
  {
    id: 'equilibre-unipodal', name: 'Équilibre unipodal', aliases: ['Proprioception', 'Équilibre sur une jambe'], category: 'pieds',
    defaults: { sets: 2, duration: 30, rest: 10 }, perSide: true,
    cues: ['Debout sur une jambe, genou souple', 'Tenir sans bouger le bassin', 'Plus dur : yeux fermés ou sur coussin'],
    why: 'Proprioception de la cheville : moins d\'entorses sur les sentiers.',
    figure: {
      anchor: 'rAnkle', at: ANKLE,
      frames: [
        { pose: pose({ t: 2, lt: 80, ls: -5, lf: 70, ra: 40, rfa: 50, la: -40, lfa: -50 }), hold: 0.4 },
        { pose: pose({ t: -2, lt: 80, ls: -5, lf: 70, ra: 30, rfa: 40, la: -30, lfa: -40 }), move: 1.2, hold: 0.4 },
      ],
    },
  },

  // ---------------- Pliométrie et éducatifs
  {
    id: 'skipping', name: 'Skipping', aliases: ['Montées de genoux', 'Skipping haut'], category: 'plio',
    defaults: { sets: 3, duration: 20, rest: 40 },
    cues: ['Sur l\'avant du pied, buste droit', 'Monter les genoux à hauteur de hanche, vite', 'Bras actifs, coudes à 90°'],
    why: 'Fréquence et réactivité de pied : un éducatif de base du coureur.',
    figure: {
      anchor: 'lToe', at: [111, 147],
      frames: [
        { pose: RUN_A, move: 0.22, hold: 0.04 },
        { pose: swapArms(swapLegs(RUN_A)), anchor: 'rToe', move: 0.22, hold: 0.04 },
      ],
    },
  },
  {
    id: 'talons-fesses', name: 'Talons-fesses', category: 'plio',
    defaults: { sets: 3, duration: 20, rest: 40 },
    cues: ['Sur l\'avant du pied, genoux vers le sol', 'Ramener vite le talon sous la fesse', 'Rythme rapide, bras actifs'],
    why: 'Travaille le retour de jambe et la fréquence.',
    figure: {
      anchor: 'lToe', at: [111, 147],
      frames: [
        { pose: { ...RUN_A, rt: -8, rs: -165, rf: -140 }, move: 0.22, hold: 0.04 },
        { pose: swapArms(swapLegs({ ...RUN_A, rt: -8, rs: -165, rf: -140 })), anchor: 'rToe', move: 0.22, hold: 0.04 },
      ],
    },
  },
  {
    id: 'foulees-bondissantes', name: 'Foulées bondissantes', aliases: ['Bondissements', 'Bounds'], category: 'plio',
    defaults: { sets: 4, reps: 10, rest: 90 },
    cues: ['Grandes foulées, le plus loin possible', 'Genou avant haut, jambe arrière bien poussée', 'Bras opposés amples, atterrir sous soi'],
    why: 'Puissance et raideur de la cheville : plus de distance par foulée.',
    figure: {
      anchor: 'rToe', at: [100, 147],
      frames: [
        { pose: pose({ t: 12, rt: -35, rs: -35, rf: 30, lt: 75, ls: 10, lf: 80, ra: 70, rfa: 140, la: -50, lfa: 20 }), move: 0.35, hold: 0.08 },
        { pose: pose({ t: 12, lt: -35, ls: -35, lf: 30, rt: 75, rs: 10, rf: 80, la: 70, lfa: 140, ra: -50, rfa: 20 }), anchor: 'lToe', at: [100, 147], move: 0.35, hold: 0.08 },
      ],
    },
  },
  {
    id: 'pogo', name: 'Sauts pieds joints', aliases: ['Pogo', 'Pogo jumps', 'Sauts sur place'], category: 'plio',
    defaults: { sets: 3, reps: 20, rest: 45 },
    cues: ['Petits sauts rapides sur l\'avant du pied', 'Genoux presque tendus, chevilles toniques', 'Temps au sol le plus court possible'],
    why: 'Raideur du tendon d\'Achille : elle rend la foulée plus économe.',
    figure: {
      anchor: 'rToe', at: [111, 147],
      frames: [
        { pose: pose({ rf: 40, lf: 40, ra: 20, rfa: 70, la: 20, lfa: 70 }), move: 0.16, hold: 0.02 },
        { pose: pose({ rf: 25, lf: 25, ra: 20, rfa: 70, la: 20, lfa: 70 }), at: [111, 130], move: 0.16, hold: 0.02 },
      ],
    },
  },
  {
    id: 'corde-a-sauter', name: 'Corde à sauter', aliases: ['Corde'], category: 'plio',
    defaults: { sets: 3, duration: 60, rest: 30 },
    cues: ['Coudes près du corps, ce sont les poignets qui tournent', 'Petits sauts sur l\'avant du pied', 'Rester relâché des épaules'],
    why: 'Réactivité des pieds et des mollets, en échauffement ou en circuit.',
    figure: {
      anchor: 'rToe', at: [111, 147],
      frames: [
        { pose: pose({ rf: 40, lf: 40, ra: 15, rfa: 60, la: 15, lfa: 60 }), move: 0.18, hold: 0.02 },
        { pose: pose({ rf: 25, lf: 25, ra: 15, rfa: 60, la: 15, lfa: 60 }), at: [111, 135], move: 0.18, hold: 0.02 },
      ],
    },
  },
  {
    id: 'squat-jump', name: 'Squat sauté', aliases: ['Squat jump', 'Squats sautés'], category: 'plio',
    defaults: { sets: 3, reps: 8, rest: 60 },
    cues: ['Descendre en demi-squat', 'Sauter le plus haut possible, bras vers le ciel', 'Atterrir souple et enchaîner'],
    why: 'Puissance des jambes, utile pour les relances et les finish.',
    figure: {
      anchor: 'rAnkle', at: ANKLE,
      frames: [
        { pose: HALF_SQUAT, move: 0.5 },
        { pose: pose({ rf: 30, lf: 30, ra: 165, rfa: 170, la: 165, lfa: 170 }), at: [100, 118], move: 0.3, hold: 0.1 },
        { pose: HALF_SQUAT, move: 0.3, hold: 0.2 },
      ],
    },
  },
  {
    id: 'fentes-sautees', name: 'Fentes sautées', aliases: ['Jumping lunges'], category: 'plio',
    defaults: { sets: 3, reps: 10, rest: 60 },
    cues: ['Départ en fente basse', 'Sauter et inverser les jambes en l\'air', 'Atterrir en fente, genou arrière près du sol'],
    why: 'Puissance unilatérale et coordination.',
    figure: {
      anchor: 'rAnkle', at: [128, 146],
      frames: [
        { pose: LUNGE_DOWN, move: 0.35, hold: 0.15 },
        { pose: swapLegs(LUNGE_DOWN), anchor: 'lAnkle', at: [128, 146], move: 0.35, hold: 0.15 },
      ],
    },
  },
  {
    id: 'box-jump', name: 'Sauts sur box', aliases: ['Box jump'], category: 'plio',
    defaults: { sets: 3, reps: 6, rest: 60 },
    cues: ['Face à une box stable, pieds largeur de hanches', 'Élan des bras, sauter et atterrir souple sur la box', 'Redescendre en marchant, pas en sautant'],
    why: 'Puissance verticale avec un atterrissage doux pour les articulations.',
    figure: {
      anchor: 'rAnkle', at: [72, 146],
      frames: [
        { pose: { ...HALF_SQUAT, ra: -50, rfa: -30, la: -50, lfa: -30 }, move: 0.6 },
        { pose: pose({ t: 10, rt: 70, rs: -20, lt: 70, ls: -20, ra: 150, rfa: 160, la: 150, lfa: 160 }), at: [108, 112], move: 0.3 },
        { pose: { ...HALF_SQUAT, ra: 80, rfa: 88, la: 80, lfa: 88 }, at: [140, 110], move: 0.25, hold: 0.2 },
        { pose: STAND, at: [140, 110], move: 0.5, hold: 0.4 },
      ],
      props: [{ kind: 'box', x: 120, w: 52, h: 36 }],
    },
  },
  {
    id: 'cloche-pied', name: 'Sauts à cloche-pied', aliases: ['Cloche-pied', 'Hops unipodaux'], category: 'plio',
    defaults: { sets: 3, reps: 10, rest: 60 }, perSide: true,
    cues: ['Sur une jambe, petits sauts rapides', 'Cheville tonique, genou dans l\'axe', 'Bassin stable, l\'autre jambe pliée'],
    why: 'Réactivité et stabilité sur un appui, comme en course.',
    figure: {
      anchor: 'rToe', at: [111, 147],
      frames: [
        { pose: pose({ rf: 40, lt: -10, ls: -95, lf: -70, ra: -30, rfa: 40, la: 40, lfa: 110 }), move: 0.18, hold: 0.03 },
        { pose: pose({ rf: 25, lt: -10, ls: -95, lf: -70, ra: -30, rfa: 40, la: 40, lfa: 110 }), at: [111, 130], move: 0.18, hold: 0.03 },
      ],
    },
  },
  {
    id: 'burpees', name: 'Burpees', aliases: ['Burpee'], category: 'plio',
    defaults: { sets: 3, duration: 30, rest: 30 },
    cues: ['Accroupi, mains au sol', 'Jeter les pieds en planche, revenir accroupi', 'Se relever en sautant, bras en l\'air'],
    why: 'Circuit cardio complet, à garder pour varier.',
    figure: {
      anchor: 'rAnkle', at: ANKLE,
      frames: [
        { pose: STAND, move: 0.4 },
        { pose: pose({ t: 45, rt: 110, rs: -40, lt: 110, ls: -40, ra: 10, rfa: 10, la: 10, lfa: 10 }), move: 0.45 },
        { pose: HIGH_PLANK, anchor: 'rWrist', at: [131, 147], move: 0.35, hold: 0.15 },
        { pose: pose({ t: 45, rt: 110, rs: -40, lt: 110, ls: -40, ra: 10, rfa: 10, la: 10, lfa: 10 }), move: 0.35 },
        { pose: pose({ rf: 30, lf: 30, ra: 170, rfa: 175, la: 170, lfa: 175 }), at: [100, 124], move: 0.35, hold: 0.1 },
      ],
    },
  },

  // ---------------- Hanches
  {
    id: 'abduction-couche', name: 'Abduction de hanche couché', aliases: ['Abduction couché', 'Levée de jambe latérale'], category: 'hanches',
    defaults: { sets: 3, reps: 15, rest: 20 }, loadable: true, perSide: true,
    cues: ['Couché sur le côté, corps aligné', 'Monter la jambe du dessus tendue, pointe vers l\'avant', 'Ne pas basculer le bassin en arrière'],
    why: 'Cible le moyen fessier : moins de genou qui rentre, moins de syndrome de l\'essuie-glace.',
    figure: {
      anchor: 'hip', at: [100, 141],
      frames: [
        { pose: pose({ t: -90, rt: 90, rs: 90, rf: 180, lt: 90, ls: 90, lf: 180, ra: 120, rfa: 90, la: -90, lfa: -180 }) },
        { pose: pose({ t: -90, rt: 128, rs: 128, rf: 218, lt: 90, ls: 90, lf: 180, ra: 120, rfa: 90, la: -90, lfa: -180 }), move: 0.8, hold: 0.4 },
      ],
    },
  },
  {
    id: 'clamshell', name: 'Clamshell', aliases: ['Coquillage'], category: 'hanches',
    defaults: { sets: 3, reps: 15, rest: 20 }, perSide: true,
    cues: ['Couché sur le côté, genoux fléchis, pieds joints', 'Ouvrir le genou du dessus sans décoller les pieds', 'Bassin immobile ; plus dur avec un élastique'],
    why: 'Active les rotateurs et le moyen fessier qui stabilisent le genou.',
    figure: {
      anchor: 'hip', at: [100, 141],
      frames: [
        { pose: pose({ t: -90, rt: 55, rs: 150, rf: 180, lt: 55, ls: 150, lf: 180, ra: 120, rfa: 90, la: -90, lfa: -180 }) },
        { pose: pose({ t: -90, rt: 120, rs: 175, rf: 180, lt: 55, ls: 150, lf: 180, ra: 120, rfa: 90, la: -90, lfa: -180 }), move: 0.8, hold: 0.4 },
      ],
      props: [{ kind: 'band', at: 'knees' }],
    },
  },
  {
    id: 'marche-laterale', name: 'Marche latérale élastique', aliases: ['Monster walk', 'Pas chassés élastique'], category: 'hanches',
    defaults: { sets: 3, reps: 12, rest: 30 },
    cues: ['Élastique autour des genoux ou des chevilles', 'Genoux fléchis, pas latéraux sans rapprocher les pieds', 'Buste stable, ne pas se dandiner'],
    why: 'Renforce les abducteurs de hanche, protège genou et bandelette.',
    figure: {
      anchor: 'lAnkle', at: [82, 146],
      frames: [
        { pose: pose({ t: 0, rt: 18, rs: 6, rf: 100, lt: -18, ls: -6, lf: -100, ra: 25, rfa: 80, la: -25, lfa: -80 }), move: 0.5, hold: 0.15 },
        { pose: pose({ t: 0, rt: 30, rs: 18, rf: 100, lt: -18, ls: -6, lf: -100, ra: 25, rfa: 80, la: -25, lfa: -80 }), move: 0.5, hold: 0.15 },
      ],
      props: [{ kind: 'band', at: 'ankles' }],
    },
  },
  {
    id: 'copenhague', name: 'Planche de Copenhague', aliases: ['Copenhagen', 'Gainage adducteurs'], category: 'hanches',
    defaults: { sets: 3, duration: 20, rest: 30 }, perSide: true,
    cues: ['Planche latérale, jambe du dessus posée sur un banc', 'Monter la jambe du dessous vers le banc', 'Corps aligné, bassin haut'],
    why: 'Renforce les adducteurs, souvent oubliés et sujets aux pubalgies.',
    figure: {
      anchor: 'rElbow', at: [150, 146],
      frames: [
        { pose: pose({ t: 88, lt: -88, ls: -88, lf: 0, rt: -45, rs: -15, rf: 0, ra: 0, rfa: 90, la: 175, lfa: 178 }) },
        { pose: pose({ t: 88, lt: -88, ls: -88, lf: 0, rt: -86, rs: -86, rf: 0, ra: 0, rfa: 90, la: 175, lfa: 178 }), move: 1, hold: 0.6 },
      ],
      props: [{ kind: 'box', x: 8, w: 40, h: 22 }],
    },
  },

  // ---------------- Haut du corps
  {
    id: 'pompes', name: 'Pompes', aliases: ['Pompe'], category: 'haut',
    defaults: { sets: 3, reps: 12, rest: 45 },
    cues: ['Mains sous les épaules, corps gainé', 'Descendre la poitrine près du sol, coudes à 45°', 'Remonter sans casser le bassin ; sur les genoux pour débuter'],
    why: 'Haut du corps et gainage : une posture qui tient en fin de course.',
    figure: { anchor: 'rWrist', at: [150, 147], frames: [{ pose: HIGH_PLANK }, { pose: PUSHUP_DOWN, move: 0.9 }] },
  },
  {
    id: 'rowing-haltere', name: 'Rowing haltère', aliases: ['Rowing', 'Tirage haltère'], category: 'haut',
    defaults: { sets: 3, reps: 10, rest: 45, load: 10 }, loadable: true, perSide: true,
    cues: ['Une main en appui sur un banc, dos plat', 'Tirer l\'haltère vers la hanche, coude près du corps', 'Redescendre en contrôlant'],
    why: 'Muscle le dos, pour un balancier de bras efficace et une posture droite.',
    figure: {
      anchor: 'rAnkle', at: [70, 146],
      frames: [
        { pose: pose({ t: 75, rt: 15, rs: -5, lt: 15, ls: -5, ra: 0, rfa: 0, la: 30, lfa: 20 }) },
        { pose: pose({ t: 75, rt: 15, rs: -5, lt: 15, ls: -5, ra: -110, rfa: 0, la: 30, lfa: 20 }), move: 0.8, hold: 0.3 },
      ],
      props: [{ kind: 'box', x: 115, w: 60, h: 40 }, { kind: 'dumbbell' }],
    },
  },
  {
    id: 'balancier-bras', name: 'Balancier de bras', aliases: ['Bras de course', 'Arm drive'], category: 'haut',
    defaults: { sets: 3, duration: 30, rest: 30, load: 1 }, loadable: true,
    cues: ['Debout ou en fente, petits haltères en main', 'Bras à 90°, mouvement d\'avant en arrière, pas en travers', 'Épaules basses et relâchées'],
    why: 'Un bras efficace rythme la foulée, surtout en côte et au finish.',
    figure: {
      anchor: 'rAnkle', at: ANKLE,
      frames: [
        { pose: pose({ t: 4, ra: 55, rfa: 150, la: -40, lfa: 45 }), move: 0.35, hold: 0.03 },
        { pose: pose({ t: 4, la: 55, lfa: 150, ra: -40, rfa: 45 }), move: 0.35, hold: 0.03 },
      ],
      props: [{ kind: 'dumbbells' }],
    },
  },

  // ---------------- Mobilité
  {
    id: 'fente-psoas', name: 'Étirement du psoas en fente', aliases: ['Étirement psoas', 'Fente basse'], category: 'mobilite',
    defaults: { sets: 2, duration: 30, rest: 0 }, perSide: true,
    cues: ['Genou arrière au sol, pied avant loin devant', 'Rentrer le bassin et avancer les hanches', 'Bras du côté étiré vers le ciel'],
    why: 'Libère la hanche pour une meilleure extension de jambe en course.',
    figure: {
      anchor: 'rAnkle', at: [132, 146],
      frames: [
        { pose: pose({ t: 0, rt: 80, rs: -8, lt: -18, ls: -92, lf: -150, ...ARMS_DOWN }) },
        { pose: pose({ t: -4, rt: 95, rs: -30, lt: -42, ls: -92, lf: -150, ra: 170, rfa: 175, la: 0, lfa: 0 }), move: 1.4, hold: 1 },
      ],
    },
  },
  {
    id: 'mobilite-cheville', name: 'Mobilité de cheville au mur', aliases: ['Genou au mur', 'Knee to wall'], category: 'mobilite',
    defaults: { sets: 2, reps: 10, rest: 0 }, perSide: true,
    cues: ['Face au mur, pied à une main du mur', 'Pousser le genou vers le mur sans décoller le talon', 'Reculer le pied si c\'est facile'],
    why: 'Une cheville mobile amortit mieux et soulage mollet et genou.',
    figure: {
      anchor: 'rAnkle', at: [140, 146],
      frames: [
        { pose: pose({ t: 0, rt: 88, rs: -5, lt: -8, ls: -92, lf: -150, ra: 78, rfa: 85, la: 78, lfa: 85 }) },
        { pose: pose({ t: 3, rt: 80, rs: -30, lt: -2, ls: -92, lf: -150, ra: 72, rfa: 88, la: 72, lfa: 88 }), move: 0.8, hold: 0.5 },
      ],
      props: [{ kind: 'wall', x: 180 }],
    },
  },
]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const byName = new Map<string, Exercise>()
for (const e of EXERCISES) for (const n of [e.name, ...(e.aliases ?? [])]) byName.set(norm(n), e)

/** Exercice de la bibliothèque d'un élément de programme : par identifiant, sinon par nom. */
export function findExercise(it: Pick<PpgItem, 'exercise' | 'exerciseId'>): Exercise | undefined {
  if (it.exerciseId) {
    const e = EXERCISES.find((x) => x.id === it.exerciseId)
    if (e) return e
  }
  return byName.get(norm(it.exercise))
}

/** Recherche dans la bibliothèque : nom, autres noms, sans tenir compte des accents. */
export function searchExercises(q: string, cat?: Category | null): Exercise[] {
  const n = norm(q)
  return EXERCISES.filter((e) => (!cat || e.category === cat) && (!n || [e.name, ...(e.aliases ?? [])].some((x) => norm(x).includes(n))))
}

/** Nouvel élément de programme à partir d'un exercice de la bibliothèque. */
export function itemFrom(e: Exercise): PpgItem {
  return { exercise: e.name, exerciseId: e.id, ...e.defaults }
}
