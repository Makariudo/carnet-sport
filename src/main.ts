import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'
import { initStore } from './stores/sport'

initStore()
createApp(App).use(router).mount('#app')
