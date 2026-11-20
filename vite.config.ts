import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mon sport',
        short_name: 'Sport',
        description: 'Carnet d’entraînement : course, vélo, natation, PPG, jalons et calculateur d’allure.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F3F0',
        theme_color: '#D9480F',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
