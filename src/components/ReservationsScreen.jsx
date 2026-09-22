import { useEffect, useState } from 'react'
import { reservationsApi, apiOrigin } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:3000'

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReservationsScreen() {
  const { user, token, logout, handleAuthError } = useAuth()
  const [reservations, setReservations] = useState([])
  const [date, setDate] = useState(todayIso)
  const [timeSlot, setTimeSlot] = useState('09:00-10:00')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadReservations() {
    setError('')
    try {
      const { data } = await reservationsApi.list(token)
      setReservations(data)
    } catch (err) {
      handleAuthError(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReservations()
    // token is stable for this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!token || typeof window.io !== 'function') {
      return undefined
    }
    const socket = window.io(apiOrigin(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    })
    socket.on('reservation_updated', (payload) => {
      if (!payload || payload.reservationId == null) {
        return
      }
      setReservations((current) =>
        current.map((item) =>
          Number(item.id) === Number(payload.reservationId)
            ? { ...item, status: payload.status, updatedAt: payload.updatedAt }
            : item
        )
      )
    })
    return () => {
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function onCreate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      await reservationsApi.create(token, { date, time_slot: timeSlot })
      setNotice('Reserva creada')
      await loadReservations()
    } catch (err) {
      handleAuthError(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function onStatus(id, status) {
    setError('')
    setNotice('')
    try {
      await reservationsApi.update(token, id, { status })
      await loadReservations()
    } catch (err) {
      handleAuthError(err)
      setError(err.message)
    }
  }

  async function onDelete(id) {
    setError('')
    setNotice('')
    try {
      await reservationsApi.remove(token, id)
      setNotice('Reserva eliminada')
      await loadReservations()
    } catch (err) {
      handleAuthError(err)
      setError(err.message)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <a className="logo-word" href={SITE_URL}>
            Rendi<span>Ya</span>
          </a>
          <p className="eyebrow">Dashboard de reservas</p>
          <h1>Turnos</h1>
        </div>
        <div className="session">
          <p>
            {user?.name} · {user?.email}
          </p>
          <button type="button" className="ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <p>
        <a className="back-link" href={SITE_URL}>
          ← Volver al sitio
        </a>
      </p>

      <section className="panel">
        <h2>Nueva reserva</h2>
        <form className="inline-form" onSubmit={onCreate}>
          <label>
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Franja
            <input
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              placeholder="09:00-10:00"
              required
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </form>
      </section>

      {error && <p className="alert">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <section className="panel">
        <h2>Mis turnos</h2>
        {loading ? (
          <p>Cargando reservas…</p>
        ) : reservations.length === 0 ? (
          <p>Todavía no hay reservas. Creá la primera arriba.</p>
        ) : (
          <ul className="reservation-list">
            {reservations.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>
                    {item.date} · {item.time_slot}
                  </strong>
                  <span className={`badge badge-${item.status}`}>
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                </div>
                <div className="actions">
                  {item.status !== 'confirmed' && (
                    <button type="button" className="ghost" onClick={() => onStatus(item.id, 'confirmed')}>
                      Confirmar
                    </button>
                  )}
                  {item.status !== 'cancelled' && (
                    <button type="button" className="ghost" onClick={() => onStatus(item.id, 'cancelled')}>
                      Cancelar
                    </button>
                  )}
                  <button type="button" className="danger" onClick={() => onDelete(item.id)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
