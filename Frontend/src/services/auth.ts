import type { LoginData } from '../utils/login.ts'
import { apiBaseUrl } from './api.ts'

export type UserSession = { accessToken: string; userId: string; userType: 'BUYER' | 'PRODUCER' | 'ADMIN'; role?: 'SUPER_ADMIN' | 'ADMIN' }

let refreshRequest: Promise<UserSession | null> | undefined

async function request(route: 'users' | 'admin', endpoint: string, data?: LoginData, baseUrl = apiBaseUrl) {
  if (!baseUrl) throw new Error('O acesso está temporariamente indisponível. Tente novamente mais tarde.')
  try {
    return await fetch(`${baseUrl.replace(/\/+$/, '')}/${route}/${endpoint}`, {
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
      typeof data.userId !== 'string' || !data.userId ||
      !['BUYER', 'PRODUCER', 'ADMIN'].includes(data.userType)) {
    throw new Error('Não foi possível confirmar seu acesso. Tente novamente.')
  }
  return {
    accessToken: data.accessToken,
    userId: data.userId,
    userType: data.userType,
    ...(data.role && { role: data.role }),
  }
}

export async function loginUser(data: LoginData, baseUrl = apiBaseUrl): Promise<UserSession> {
  const userResponse = await request('users', 'login', data, baseUrl)
  if (userResponse.ok) return readSession(userResponse)
  if (userResponse.status === 429) throw new Error('Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.')

  if (userResponse.status === 401 || userResponse.status === 400) {
    const adminResponse = await request('admin', 'login', data, baseUrl)
    if (adminResponse.ok) return readSession(adminResponse)
    if (adminResponse.status === 429) throw new Error('Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.')
    if (adminResponse.status === 401) throw new Error('E-mail ou senha incorretos. Confira seus dados e tente novamente.')
    if (adminResponse.status === 400) throw new Error('Confira o e-mail e a senha informados.')
  }

  throw new Error('Não foi possível entrar agora. Tente novamente mais tarde.')
}

export function restoreSession(baseUrl = apiBaseUrl): Promise<UserSession | null> {
  if (!baseUrl) return Promise.resolve(null)
  // Share the request so React Strict Mode does not rotate the same cookie twice.
  refreshRequest ??= (async () => {
    const userResponse = await request('users', 'refresh', undefined, baseUrl)
    if (userResponse.ok) return readSession(userResponse)

    const adminResponse = await request('admin', 'refresh', undefined, baseUrl)
    if (adminResponse.ok) return readSession(adminResponse)
    if (userResponse.status === 401 && adminResponse.status === 401) return null
    throw new Error('Não foi possível recuperar sua sessão. Entre novamente.')
  })().finally(() => { refreshRequest = undefined })
  return refreshRequest
}

export async function logoutUser(baseUrl = apiBaseUrl) {
  const adminResponse = await request('admin', 'logout', undefined, baseUrl)
  if (adminResponse.ok) return

  const userResponse = await request('users', 'logout', undefined, baseUrl)
  if (!userResponse.ok) throw new Error('Não foi possível sair agora. Tente novamente.')
}
