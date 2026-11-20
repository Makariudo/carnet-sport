<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isCloud, userEmail } from '../stores/sport'

const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Mon sport')
</script>

<template>
  <header class="top">
    <div class="wrap">
      <div class="brand">
        <span class="name">{{ title }}</span>
        <span class="proto">{{ isCloud ? userEmail : 'Données d’exemple · sur cet appareil' }}</span>
      </div>
      <slot />
    </div>
  </header>
</template>
