import { createContext, useContext, useMemo, useState } from 'react'
import { ApiError, authApi } from '../api/client'

const STORAGE_KEY = 'rendiya-session'
const AuthContext = createContext(null)

function userFromToken(token) {
  try {
    const part = token.split('.')[1] || ''
    const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || payload.email,
      role: payload.role,
    }
  } catch {
    return { name: 'Usuario', email: '' }
  }
}

function consumeTokenFromUrl() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (!token) return null

  const next = { user: userFromToken(token), token }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  params.delete('token')
  const query = params.toString()
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  return next
}

function readSession() {
  const fromUrl = consumeTokenFromUrl()
  if (fromUrl) return fromUrl

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
