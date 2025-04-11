import { defineStore } from 'pinia'
import type { User } from '~/types/user'
import type { KdfParams } from '~/types/kdfParams'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    user: null as User | null,
    token: null as string | null,
    privateKey: null as string | null,
    publicKey: null as string | null,
    kdfSalt: null as string | null,
    kdfParams: null as KdfParams | null
  }),

  actions: {
    setAuthState(user: User, token: string) {
      this.user = user
      this.token = token
      this.isAuthenticated = true
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('authToken', token)
      }
    },

    initializeFromStorage() {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const token = sessionStorage.getItem('authToken')
        if (token) {
          this.token = token
          this.isAuthenticated = true
        }
      }
    },

    clearAuthState() {
      this.user = null
      this.token = null
      this.privateKey = null
      this.publicKey = null
      this.kdfSalt = null
      this.kdfParams = null
      this.isAuthenticated = false
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem('authToken')
      }
    },

    setToken(token: string) {
      this.token = token
    },

    setPrivateKey(privateKey: string) {
      this.privateKey = privateKey
    },

    setKdfInfo(salt: string, params: KdfParams) {
      this.kdfSalt = salt
      this.kdfParams = params
    },

    setPublicKey(publicKey: string) {
      this.publicKey = publicKey
    }
  },

  getters: {
    isLoggedIn(): boolean {
      return this.isAuthenticated
    },
    getUsername(): string | null {
      return this.user?.username || null
    },
    getAuthToken(): string | null {
      return this.token
    },
    getPrivateKey(): string | null {
      return this.privateKey
    },
    getPublicKey(): string | null {
      return this.publicKey
    },
    getKdfSalt(): string | null {
      return this.kdfSalt
    },
    getKdfParams(): KdfParams | null {
      return this.kdfParams
    }
  }
})