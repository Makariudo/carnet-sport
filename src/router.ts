import { createRouter, createWebHistory } from 'vue-router'
import SaisirView from './views/SaisirView.vue'
import { PLANNING_ENABLED } from './lib/features'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'saisir', component: SaisirView, meta: { title: 'Nouvelle séance' } },
    { path: '/seance/:id', name: 'seance', component: SaisirView, meta: { title: 'Séance' } },
    { path: '/journal', name: 'journal', component: () => import('./views/JournalView.vue'), meta: { title: 'Journal' } },
    { path: '/jalons', name: 'jalons', component: () => import('./views/JalonsView.vue'), meta: { title: 'Jalons' } },
    { path: '/stats', name: 'stats', component: () => import('./views/StatsView.vue'), meta: { title: 'Stats' } },
    { path: '/plus', name: 'plus', component: () => import('./views/PlusView.vue'), meta: { title: 'Plus' } },
    ...(PLANNING_ENABLED
      ? [{ path: '/planning', name: 'planning', component: () => import('./views/PlanningView.vue'), meta: { title: 'Planning' } }]
      : []),
    { path: '/ppg', name: 'ppg', component: () => import('./views/PpgView.vue'), meta: { title: 'PPG' } },
    { path: '/minuteur/:id', name: 'minuteur', component: () => import('./views/TimerView.vue'), meta: { fullscreen: true } },
    { path: '/calculateur', name: 'calculateur', component: () => import('./views/CalculatorView.vue'), meta: { title: 'Calculateur' } },
    ...(import.meta.env.DEV ? [{ path: '/dev/figures', name: 'dev-figures', component: () => import('./views/FiguresDevView.vue') }] : []),
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
