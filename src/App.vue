<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import TabBar from './components/TabBar.vue'
import ToastMessage from './components/ToastMessage.vue'
import AccessScreen from './components/AccessScreen.vue'
import { status } from './stores/sport'

const route = useRoute()
</script>

<template>
  <template v-if="status === 'ready'">
    <!-- Le minuteur prend tout l'écran : ni en-tête ni onglets. -->
    <RouterView v-if="route.meta.fullscreen" />
    <template v-else>
      <AppHeader />
      <main class="wrap">
        <RouterView />
      </main>
      <TabBar />
    </template>
  </template>
  <AccessScreen v-else />
  <ToastMessage />
</template>
