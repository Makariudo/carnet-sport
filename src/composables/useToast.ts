import { ref } from 'vue'

const message = ref<string | null>(null)
const tone = ref<'info' | 'warn' | 'win'>('info')
let timer: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  /** Affiche un message en bas de l'écran. */
  function show(text: string, kind: 'info' | 'warn' | 'win' = 'info') {
    message.value = text
    tone.value = kind
    clearTimeout(timer)
    timer = setTimeout(() => (message.value = null), kind === 'info' ? 2600 : 4500)
  }
  return { message, tone, show }
}
