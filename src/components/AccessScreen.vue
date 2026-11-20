<script setup lang="ts">
import { auth, status } from '../stores/sport'
</script>

<template>
  <main class="access wrap">
    <img src="/icon.svg" alt="" width="64" height="64" />
    <h1>Mon sport</h1>

    <p v-if="status === 'loading'" class="note">Chargement de tes séances…</p>

    <template v-else-if="status === 'signed-out'">
      <p>Course, vélo, natation et PPG : ton carnet d'entraînement, tes jalons et tes stats.</p>
      <button type="button" class="go google" @click="auth.signIn()">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
        </svg>
        Se connecter avec Google
      </button>
    </template>

    <template v-else>
      <p>Impossible de charger les données. Vérifie ta connexion, puis réessaie.</p>
      <div class="btns">
        <button type="button" class="btn primary" @click="auth.retry()">Réessayer</button>
        <button type="button" class="btn" @click="auth.signOut()">Se déconnecter</button>
      </div>
    </template>
  </main>
</template>

<style scoped>
.access { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; justify-content: center; gap: 14px; padding-block: 32px }
h1 { font-family: var(--f-display); font-weight: 700; font-size: 30px; margin: 0; letter-spacing: -.02em }
p { margin: 0; color: var(--muted); max-width: 34ch }
img { border-radius: 16px }
.google { display: inline-flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px }
.google svg { background: #fff; border-radius: 50%; padding: 2px; box-sizing: content-box }
</style>
