const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')

export function apiOrigin() {
  return API_BASE.replace(/\/api$/i, '')
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('No se pudo conectar con la API. ¿Está corriendo en el puerto 3001?', 0)
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    throw new ApiError(payload.message || 'Error inesperado en la API', response.status)
  }

  return payload
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name, email, password) =>
    apiRequest('/auth/register', { method: 'POST', body: { name, email, password } }),
}

export const reservationsApi = {
  list: (token) => apiRequest('/reservations', { token }),
  create: (token, data) =>
    apiRequest('/reservations', { method: 'POST', token, body: data }),
  update: (token, id, data) =>
    apiRequest(`/reservations/${id}`, { method: 'PUT', token, body: data }),
  remove: (token, id) =>
    apiRequest(`/reservations/${id}`, { method: 'DELETE', token }),
}
