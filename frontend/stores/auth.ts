/**
 * Store Pinia pour la gestion de l'authentification utilisateur.
 * Gère l'état de connexion, les informations utilisateur, les jetons d'authentification,
 * ainsi que les clés cryptographiques et paramètres de dérivation associés.
 * Permet l'initialisation, la mise à jour et la réinitialisation sécurisée de l'état d'authentification.
 */

import { defineStore } from 'pinia'
import type { User } from '~/types/user'
import type { KdfParams } from '~/types/kdfParams'

/**
 * Store d'authentification pour gérer l'état de l'utilisateur et les informations de connexion.
 */
export const useAuthStore = defineStore('auth', {
  /**
   * État initial du store d'authentification.
   */
  state: () => ({
    /**
     * Indique si l'utilisateur est authentifié.
     */
    isAuthenticated: false,
    /**
     * Informations de l'utilisateur actuellement connecté.
     */
    user: null as User | null,
    /**
     * Jeton d'authentification de l'utilisateur.
     */
    token: null as string | null,
    /**
     * Clé privée de l'utilisateur pour les opérations cryptographiques.
     */
    privateKey: null as Uint8Array<ArrayBufferLike> | null,
    /**
     * Clé publique de l'utilisateur.
     */
    publicKey: null as Uint8Array<ArrayBufferLike> | null,
    /**
     * Sel utilisé pour la dérivation de clé.
     */
    kdfSalt: null as Uint8Array<ArrayBufferLike> | null,
    /**
     * Paramètres de la fonction de dérivation de clé.
     */
    kdfParams: null as KdfParams | null
  }),

  actions: {
    /**
     * Met à jour l'état d'authentification avec les informations de l'utilisateur et le jeton d'authentification.
     * @param user - Informations de l'utilisateur.
     * @param token - Jeton d'authentification.
     */
    setAuthState(user: User, token: string) {
      this.user = user
      this.token = token
      this.isAuthenticated = true
      // Stocke le jeton dans sessionStorage si disponible.
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('authToken', token)
      }
    },

    /**
     * Initialise l'état d'authentification à partir de sessionStorage.
     */
    initializeFromStorage() {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const token = sessionStorage.getItem('authToken')
        if (token) {
          this.token = token
          this.isAuthenticated = true
        }
      }
    },

    /**
     * Réinitialise l'état d'authentification et supprime les informations sensibles.
     */
    clearAuthState() {
      this.user = null
      this.token = null
      this.privateKey = null
      this.publicKey = null
      this.kdfSalt = null
      this.kdfParams = null
      this.isAuthenticated = false
      // Supprime le jeton d'authentification de sessionStorage.
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('authToken')
      }
    },

    /**
     * Met à jour le jeton d'authentification.
     * @param token - Nouveau jeton d'authentification.
     */
    setToken(token: string) {
      this.token = token
    },

    /**
     * Met à jour la clé privée de l'utilisateur.
     * @param privateKey - Nouvelle clé privée.
     */
    setPrivateKey(privateKey: Uint8Array<ArrayBufferLike>) {
      this.privateKey = privateKey
    },

    /**
     * Met à jour les informations de dérivation de clé (sel et paramètres).
     * @param salt - Sel pour la dérivation de clé.
     * @param params - Paramètres de la fonction de dérivation de clé.
     */
    setKdfInfo(salt: Uint8Array<ArrayBufferLike>, params: KdfParams) {
      this.kdfSalt = salt
      this.kdfParams = params
    },

    /**
     * Met à jour la clé publique de l'utilisateur.
     * @param publicKey - Nouvelle clé publique.
     */
    setPublicKey(publicKey: Uint8Array<ArrayBufferLike>) {
      this.publicKey = publicKey
    }
  },

  getters: {
    /**
     * Vérifie si l'utilisateur est actuellement connecté.
     * @returns `true` si l'utilisateur est connecté, `false` sinon.
     */
    isLoggedIn(): boolean {
      return this.isAuthenticated
    },
    /**
     * Obtient le nom d'utilisateur de l'utilisateur actuellement connecté.
     * @returns Le nom d'utilisateur ou `null` si non disponible.
     */
    getUsername(): string | null {
      return this.user?.username || null
    },
    /**
     * Obtient le jeton d'authentification de l'utilisateur.
     * @returns Le jeton d'authentification ou `null` si non disponible.
     */
    getAuthToken(): string | null {
      return this.token
    },
    /**
     * Obtient la clé privée de l'utilisateur.
     * @returns La clé privée ou `null` si non disponible.
     */
    getPrivateKey(): Uint8Array<ArrayBufferLike> | null {
      return this.privateKey
    },
    /**
     * Obtient la clé publique de l'utilisateur.
     * @returns La clé publique ou `null` si non disponible.
     */
    getPublicKey(): Uint8Array<ArrayBufferLike> | null {
      return this.publicKey
    },
    /**
     * Obtient le sel utilisé pour la dérivation de clé.
     * @returns Le sel ou `null` si non disponible.
     */
    getKdfSalt(): Uint8Array<ArrayBufferLike> | null {
      return this.kdfSalt
    },
    /**
     * Obtient les paramètres de la fonction de dérivation de clé.
     * @returns Les paramètres de dérivation de clé ou `null` si non disponibles.
     */
    getKdfParams(): KdfParams | null {
      return this.kdfParams
    }
  }
})