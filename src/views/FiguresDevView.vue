<script setup lang="ts">
/** Page de contrôle des schémas (développement seulement) : toutes les figures, animées. */
import { EXERCISES } from '../domain/exercises'
import ExerciseFigure from '../components/ExerciseFigure.vue'
</script>

<template>
  <section class="view">
    <div class="grid">
      <figure v-for="e in EXERCISES" :key="e.id" class="card">
        <ExerciseFigure :figure="e.figure" :label="e.name" />
        <figcaption>{{ e.name }}</figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px }
figure { margin: 0; padding: 6px }
figcaption { font-size: 11px; text-align: center; color: var(--muted) }
</style>
