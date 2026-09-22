import { useEffect, useMemo, useState } from 'react'
import { reservationsApi, venuesApi, apiOrigin } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { calendarUrl, celebrateConfirmed, downloadVoucher } from '../lib/reservationShare'

const SITE_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:3000'

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function money(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? `$${amount.toLocaleString('es-AR')}` : ''
}

export default function ReservationsScreen() {
  const { user, token, logout, handleAuthError } = useAuth()
  const [reservations, setReservations] = useState([])
  const [venues, setVenues] = useState([])
  const [venueSlug, setVenueSlug] = useState('')
  const [availability, setAvailability] = useState(null)
  const [date, setDate] = useState(todayIso)
  const [timeSlot, setTimeSlot] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const venue = useMemo(
    () => venues.find((item) => item.slug === venueSlug) || null,
    [venues, venueSlug]
  )

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
    venuesApi
      .list()
      .then(({ data }) => {
        setVenues(data)
        setVenueSlug((current) => current || data[0]?.slug || '')
      })
      .catch(() => setVenues([]))
  }, [])

  // Cupos de la sede para la fecha elegida: la franja sale de la sede, no a mano.
  useEffect(() => {
    if (!venueSlug || !date) {
      setAvailability(null)
      return
    }
    let active = true
    venuesApi
      .availability(venueSlug, date)
      .then(({ data }) => {
        if (!active) return
        setAvailability(data)
        const free = data.slots.find((slot) => slot.available)
        setTimeSlot((current) => {
          const stillFree = data.slots.some((slot) => slot.time_slot === current && slot.available)
          return stillFree ? current : free?.time_slot || ''
        })
      })
      .catch(() => {
        if (active) setAvailability(null)
      })
    return () => {
      active = false
    }
  }, [venueSlug, date])

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
      setReservations((current) => {
        const previous = current.find((item) => Number(item.id) === Number(payload.reservationId))
        if (payload.status === 'confirmed' && previous?.status !== 'confirmed') {
          celebrateConfirmed()
        }
        return current.map((item) =>
          Number(item.id) === Number(payload.reservationId)
            ? {
              ...item,
              status: payload.status,
              updatedAt: payload.updatedAt,
              venue: payload.venue || item.venue,
              addons: payload.addons?.length ? payload.addons : item.addons,
              assigned_vehicle: payload.assigned_vehicle ?? item.assigned_vehicle,
              assigned_instructor: payload.assigned_instructor ?? item.assigned_instructor,
            }
            : item
        )
      })
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
      await reservationsApi.create(token, { date, time_slot: timeSlot, venue_slug: venueSlug })
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
            Sede
            <select value={venueSlug} onChange={(e) => setVenueSlug(e.target.value)} required>
              {venues.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} ({item.zone})
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Franja
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required>
              {(availability?.slots || []).map((slot) => (
                <option key={slot.time_slot} value={slot.time_slot} disabled={!slot.available}>
                  {slot.time_slot} {slot.available ? `· ${slot.free} libres` : '· completo'}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving || !timeSlot}>
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </form>
        {availability && !availability.open && (
          <p className="alert">
            {venue?.name} no toma exámenes los {availability.weekday}. Elegí otra fecha.
          </p>
        )}
        {venue?.requirements?.length > 0 && (
          <p className="hint">Requisitos en {venue.name}: {venue.requirements.join(' · ')}</p>
        )}
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
                  {money(item.amount) && <span className="amount">{money(item.amount)}</span>}
                </div>
                {item.venue && (
                  <p className="reservation-venue">
                    {item.venue.name} · {item.venue.address}
                  </p>
                )}
                {item.addons?.length > 0 && (
                  <p className="reservation-addons">
                    Extras: {item.addons.map((addon) => addon.label).join(' · ')}
                  </p>
                )}
                {(item.assigned_vehicle || item.assigned_instructor) && (
                  <p className="reservation-assignment">
                    {[item.assigned_vehicle, item.assigned_instructor].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="actions">
                  {item.status !== 'confirmed' && (
                    <button type="button" className="ghost" onClick={() => onStatus(item.id, 'confirmed')}>
                      Confirmar
                    </button>
                  )}
                  {item.status === 'confirmed' && (
                    <>
                      <button type="button" className="ghost" onClick={() => downloadVoucher(item)}>
                        Descargar Voucher
                      </button>
                      <a className="ghost" href={calendarUrl(item)} target="_blank" rel="noreferrer">
                        Agregar a Google Calendar
                      </a>
                    </>
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
