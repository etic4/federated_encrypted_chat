import tailwindcss from "@tailwindcss/vite";
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  css: ['~/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: ["@pinia/nuxt", "shadcn-nuxt"],
  // shadcn: {
  //   /**
  //    * Prefix for all the imported component
  //    */
  //   prefix: '',
  //   /**
  //    * Directory that the component lives in.
  //    * @default "./components/ui"
  //    */
  //   componentDir: './components/ui'
  // },

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:8000'
    }
  }
});