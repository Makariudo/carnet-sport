<script setup lang="ts">
import { computed } from 'vue'
import { Calculator, CalendarDays, ChevronRight, Dumbbell, LogOut, RotateCcw } from 'lucide-vue-next'
import { auth, data, isCloud, sport } from '../stores/sport'
import { todayISO, weekStart, addDays } from '../lib/dates'
import { PLANNING_ENABLED } from '../lib/features'

const mon = weekStart(todayISO())
const weekPlan = computed(() => data.plan.filter((p) => p.date >= mon && p.date <= addDays(mon, 6)))
const done = computed(() => weekPlan.value.filter((p) => p.done).length)
</script>

<template>
  <section class="view">
    <ul class="list card tight">
      <li v-if="PLANNING_ENABLED">
        <RouterLink to="/planning" class="row">
          <span class="icon" style="--tone: var(--acc)"><CalendarDays :size="19" /></span>
          <span class="lab"><b>Planning de la semaine</b><small>{{ weekPlan.length ? `${done}/${weekPlan.length} séances faites` : 'Rien de prévu cette semaine' }}</small></span>
          <ChevronRight :size="18" />
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/ppg" class="row">
          <span class="icon" style="--tone: var(--sport-ppg)"><Dumbbell :size="19" /></span>
          <span class="lab"><b>PPG</b><small>{{ data.programs.length }} programme{{ data.programs.length > 1 ? 's' : '' }} type · minuteur</small></span>
          <ChevronRight :size="18" />
        </RouterLink>
      </li>
      <li>
        <RouterLink to="/calculateur" class="row">
          <span class="icon" style="--tone: var(--sport-velo)"><Calculator :size="19" /></span>
          <span class="lab"><b>Calculateur d'allure</b><small>VMA {{ data.settings.vma.toLocaleString('fr-FR') }} km/h · temps de passage</small></span>
          <ChevronRight :size="18" />
        </RouterLink>
      </li>
    </ul>

    <div class="btns">
      <button v-if="isCloud" type="button" class="btn" @click="auth.signOut()"><LogOut :size="16" /> Se déconnecter</button>
      <button v-else type="button" class="btn" @click="sport.resetToSample()"><RotateCcw :size="16" /> Recharger les données d'exemple</button>
    </div>
    <p v-if="!isCloud" class="note">Mode démo : les séances restent sur cet appareil tant que Supabase n'est pas branché.</p>
  </section>
</template>
