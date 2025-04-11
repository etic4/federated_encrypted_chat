import { useRuntimeConfig } from '#app'

/**
 * Fonction utilitaire pour effectuer des requêtes API avec gestion automatique de l'URL de base.
 * @param url URL relative ou absolue
 * @param options Options identiques à celles de $fetch
 * @returns Résultat de la requête $fetch
 */
export function useApiFetch<T>(url: string, options?: any): Promise<T> {
  const config = useRuntimeConfig()
  console.log('[useApiFetch] useRuntimeConfig:', config)
  console.log('[useApiFetch] apiBase:', config.public?.apiBase)

  const { apiBase } = config.public || {}

  const isAbsoluteUrl = /^https?:\/\//i.test(url)
  const fullUrl = isAbsoluteUrl ? url : apiBase + url

  return $fetch<T>(fullUrl, options)
}