<script setup lang="ts">
import { useToast } from '../composables/useToast'
const { message, tone } = useToast()
</script>

<template>
  <div v-if="message" class="toast" :class="tone" role="status">{{ message }}</div>
</template>
