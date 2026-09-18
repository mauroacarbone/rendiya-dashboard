import { createContext, useContext, useMemo, useState } from 'react'
import { ApiError, authApi } from '../api/client'

const STORAGE_KEY = 'rendiya-session'
const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { user: null, token: null }
  } catch {
    return { user: null, token: null }
  }
}

export function AuthProvider({ children }) {
  const [{ user, token }, setSession] = useState(readSession)

  const persist = (next) => {
    setSession(next)
    if (next.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      async login(email, password) {
        const { data } = await authApi.login(email, password)
        persist({ user: data.user, token: data.token })
      },
      async register(name, email, password) {
        const { data } = await authApi.register(name, email, password)
        persist({ user: data.user, token: data.token })
      },
      logout() {
        persist({ user: null, token: null })
      },
      handleAuthError(error) {
        if (error instanceof ApiError && error.status === 401) {
          persist({ user: null, token: null })
        }
      },
    }),
    [user, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
