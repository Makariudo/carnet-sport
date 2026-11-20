<script setup lang="ts">
import { ChartLine, LayoutGrid, List, Plus, Trophy } from 'lucide-vue-next'
</script>

<template>
  <nav class="tabs" aria-label="Navigation">
    <div class="wrap">
      <RouterLink to="/" class="plus"><Plus :size="22" :stroke-width="1.8" />Saisir</RouterLink>
      <RouterLink to="/journal"><List :size="22" :stroke-width="1.8" />Journal</RouterLink>
      <RouterLink to="/jalons"><Trophy :size="22" :stroke-width="1.8" />Jalons</RouterLink>
      <RouterLink to="/stats"><ChartLine :size="22" :stroke-width="1.8" />Stats</RouterLink>
      <RouterLink to="/plus"><LayoutGrid :size="22" :stroke-width="1.8" />Plus</RouterLink>
    </div>
  </nav>
</template>
