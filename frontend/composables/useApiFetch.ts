import { useRuntimeConfig } from '#app'

/**
 * Fonction utilitaire pour effectuer des requêtes API avec gestion automatique de l'URL de base.
 * @param url URL relative ou absolue
 * @param options Options identiques à celles de $fetch
 * @returns Résultat de la requête $fetch
 */
export function useApiFetch<T>(url: string, options?: any): Promise<T> {
  const runtimeConfig = useRuntimeConfig()

  const { apiBase } = runtimeConfig.public || {}

  const isAbsoluteUrl = /^https?:\/\//i.test(url)
  const fullUrl = isAbsoluteUrl ? url : apiBase + url

  return $fetch<T>(fullUrl, options)
}