const BASE = ''

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  const data = await res.json()

  if (!res.ok) {
    // Auto-refresh on 401
    if (res.status === 401 && typeof window !== 'undefined') {
      const refreshed = await tryRefresh()
      if (refreshed) return request<T>(path, options)
      window.location.href = '/login'
    }
    throw new Error(data.error || 'Request failed')
  }

  return data
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    localStorage.setItem('access_token', data.accessToken)
    localStorage.setItem('refresh_token', data.refreshToken)
    return true
  } catch {
    return false
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data
  },
}
