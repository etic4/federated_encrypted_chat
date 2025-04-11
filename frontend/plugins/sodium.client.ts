import { defineNuxtPlugin } from '#app'
import sodium from 'libsodium-wrappers-sumo'

declare global {
  interface Window {
    $sodium: typeof sodium
  }
}

export default defineNuxtPlugin(async () => {
  await sodium.ready
  window.$sodium = sodium
})