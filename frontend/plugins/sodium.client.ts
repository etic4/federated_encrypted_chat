import sodium from 'libsodium-wrappers'

declare global {
  interface Window {
    $sodium: typeof sodium
  }
}

export default defineNuxtPlugin(async () => {
  await sodium.ready
  window.$sodium = sodium
})