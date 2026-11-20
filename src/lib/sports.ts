import type { Component } from 'vue'
import { Bike, Dumbbell, Footprints, Gauge, Waves } from 'lucide-vue-next'
import type { Sport } from '../domain/types'

export const SPORT_ICON: Record<Sport, Component> = {
  course: Footprints,
  velo: Bike,
  'home-trainer': Gauge,
  natation: Waves,
  ppg: Dumbbell,
}

/** Couleur CSS du sport, pour `--tone`. */
export const sportTone = (s: Sport) => `var(--sport-${s})`
