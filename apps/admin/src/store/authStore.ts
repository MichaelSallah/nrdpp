import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'BUYER' | 'SUPPLIER'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_access_token', accessToken)
          localStorage.setItem('admin_refresh_token', refreshToken)
        }
        set({ user, accessToken, refreshToken })
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_access_token')
          localStorage.removeItem('admin_refresh_token')
        }
        set({ user: null, accessToken: null, refreshToken: null })
      },

      isAuthenticated: () => !!get().user,
    }),
    {
      name: 'nrdpp-admin-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }),
    }
  )
)
