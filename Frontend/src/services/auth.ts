import type { LoginData } from '../utils/login.ts'

export type UserSession = { accessToken: string; userId: string; userType: 'BUYER' | 'PRODUCER' }

const configuredUrl = import.meta.env?.VITE_API_URL
let refreshRequest: Promise<UserSession | null> | undefined

async function request(endpoint: string, data?: LoginData, baseUrl = configuredUrl) {
  if (!baseUrl) throw new Error('O acesso está temporariamente indisponível. Tente novamente mais tarde.')
  try {
    return await fetch(`${baseUrl.replace(/\/+$/, '')}/users/${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      ...(data && { body: JSON.stringify({ email: data.email.trim().toLowerCase(), password: data.password }) }),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
  }
}

async function readSession(response: Response): Promise<UserSession> {
  const data = await response.json().catch(() => null)
  if (!data || typeof data.accessToken !== 'string' || !data.accessToken ||
      typeof data.userId !== 'string' || !data.userId || !['BUYER', 'PRODUCER'].includes(data.userType)) {
    throw new Error('Não foi possível confirmar seu acesso. Tente novamente.')
  }
  return { accessToken: data.accessToken, userId: data.userId, userType: data.userType }
}

export async function loginUser(data: LoginData, baseUrl = configuredUrl): Promise<UserSession> {
  const response = await request('login', data, baseUrl)
  if (response.status === 401) throw new Error('E-mail ou senha incorretos. Confira seus dados e tente novamente.')
  if (response.status === 429) throw new Error('Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.')
  if (response.status === 400) throw new Error('Confira o e-mail e a senha informados.')
  if (!response.ok) throw new Error('Não foi possível entrar agora. Tente novamente mais tarde.')
  return readSession(response)
}

export function restoreSession(baseUrl = configuredUrl): Promise<UserSession | null> {
  if (!baseUrl) return Promise.resolve(null)
  // Share the request so React Strict Mode does not rotate the same cookie twice.
  refreshRequest ??= (async () => {
    const response = await request('refresh', undefined, baseUrl)
    if (response.status === 401) return null
    if (!response.ok) throw new Error('Não foi possível recuperar sua sessão. Entre novamente.')
    return readSession(response)
  })().finally(() => { refreshRequest = undefined })
  return refreshRequest
}

export async function logoutUser(baseUrl = configuredUrl) {
  const response = await request('logout', undefined, baseUrl)
  if (!response.ok) throw new Error('Não foi possível sair agora. Tente novamente.')
}
