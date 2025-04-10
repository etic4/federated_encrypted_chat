import { defineStore } from 'pinia'
import type { User } from '~/types/user'
import type { KdfParams } from '~/types/kdfParams'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    user: null as User | null,
    token: null as string | null,
    privateKey: null as string | null,
    kdfSalt: null as string | null,
    kdfParams: null as KdfParams | null
  }),

  actions: {
    setAuthState(user: User, token: string) {
      this.user = user
      this.token = token
      this.isAuthenticated = true
      sessionStorage.setItem('authToken', token)
    },

    initializeFromStorage() {
      const token = sessionStorage.getItem('authToken')
      if (token) {
        this.token = token
        this.isAuthenticated = true
      }
    },

    clearAuthState() {
      this.user = null
      this.token = null
      this.privateKey = null
      this.kdfSalt = null
      this.kdfParams = null
      this.isAuthenticated = false
      sessionStorage.removeItem('authToken')
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
    getKdfSalt(): string | null {
      return this.kdfSalt
    },
    getKdfParams(): KdfParams | null {
      return this.kdfParams
    }
  }
})