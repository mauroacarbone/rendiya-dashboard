import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await register(name, email, password)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">Central RendiYa</p>
        <h1>{isRegister ? 'Crear cuenta' : 'Entrar'}</h1>
        <p className="lead">
          Conectado a la API de reservas: login, registro y turnos.
        </p>

        <form onSubmit={onSubmit}>
          {isRegister && (
            <label>
              Nombre
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <p className="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Conectando…' : isRegister ? 'Registrarme' : 'Iniciar sesión'}
          </button>
        </form>

        <button
          type="button"
          className="linkish"
          onClick={() => {
            setError('')
            setMode(isRegister ? 'login' : 'register')
          }}
        >
          {isRegister ? 'Ya tengo cuenta' : 'Quiero registrarme'}
        </button>
      </section>
    </main>
  )
}
