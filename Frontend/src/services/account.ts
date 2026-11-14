import type { Offer } from '../data/marketplace'
import type { EditorPhoto, editorPayload } from '../data/offerEditor'

const configuredUrl = import.meta.env?.VITE_API_URL
export type OfferStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SOLD_OUT' | 'CANCELLED' | 'DRAFT'
export type ManagedOffer = Offer & { status: OfferStatus; createdAt: string; updatedAt?: string; coverPhoto?: string | null }
export type UserProfile = {
  name: string
  email: string
  userType: 'BUYER' | 'PRODUCER'
  description: string | null
  location: string | null
  phone: string | null
  businessHours: string | null
  createdAt: string
}
export type ProfileUpdate = Pick<UserProfile, 'name' | 'email' | 'description' | 'location' | 'phone' | 'businessHours'>
export type NewOffer = Omit<Offer, 'id'>
export type OfferUpdate = Partial<Omit<ManagedOffer, 'id' | 'status'>> & { status?: OfferStatus }

async function request(path: string, token: string, method = 'GET', body?: object, baseUrl = configuredUrl): Promise<Response> {
  if (!baseUrl) throw new Error('O acesso à sua conta está temporariamente indisponível.')
  try {
    return await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
      signal: AbortSignal.timeout(15000),
      ...(body && { body: JSON.stringify(body) }),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
  }
}

async function responseError(response: Response, fallback: string): Promise<never> {
  if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  if (response.status === 403) throw new Error('Você não tem permissão para alterar este conteúdo.')
  if (response.status === 404) throw new Error('Este conteúdo não está mais disponível. Atualize a página.')
  if (response.status === 409) throw new Error('Os dados foram alterados. Atualize a página e tente novamente.')
  throw new Error(fallback)
}

function isProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  const nullableText = (item: unknown) => item === null || typeof item === 'string'
  return typeof data.name === 'string' && typeof data.email === 'string'
    && ['BUYER', 'PRODUCER'].includes(String(data.userType))
    && nullableText(data.description) && nullableText(data.location)
    && nullableText(data.phone) && nullableText(data.businessHours)
    && typeof data.createdAt === 'string'
}

function isManagedOffer(value: unknown): value is ManagedOffer {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return typeof data.id === 'string' && typeof data.title === 'string'
    && (typeof data.type === 'string' || data.type === null)
    && typeof data.size === 'string' && typeof data.price === 'number'
    && Number.isFinite(data.price) && typeof data.weight === 'number' && Number.isFinite(data.weight)
    && typeof data.description === 'string'
    && typeof data.minimumQuantity === 'number' && Number.isFinite(data.minimumQuantity)
    && typeof data.maximumQuantity === 'number' && Number.isFinite(data.maximumQuantity)
    && typeof data.createdAt === 'string' && Number.isFinite(Date.parse(data.createdAt))
    && typeof data.location === 'string' && typeof data.startDate === 'string' && Number.isFinite(Date.parse(data.startDate))
    && typeof data.endDate === 'string' && Number.isFinite(Date.parse(data.endDate))
    && (data.updatedAt === undefined || typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt)))
    && (data.coverPhoto === undefined || data.coverPhoto === null || typeof data.coverPhoto === 'string' && /^https?:\/\//i.test(data.coverPhoto))
    && ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SOLD_OUT', 'CANCELLED', 'DRAFT'].includes(String(data.status))
}

export async function fetchMyProfile(token: string, baseUrl = configuredUrl): Promise<UserProfile> {
  const response = await request('/users/me', token, 'GET', undefined, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível carregar os dados da conta.')
  const data: unknown = await response.json().catch(() => null)
  if (!isProfile(data)) throw new Error('O servidor retornou dados de conta inválidos.')
  return data
}

export async function updateMyProfile(token: string, data: ProfileUpdate, baseUrl = configuredUrl): Promise<void> {
  const response = await request('/users/me', token, 'PATCH', data, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível atualizar o perfil.')
}

export async function fetchMyOffers(token: string, userId: string, baseUrl = configuredUrl): Promise<ManagedOffer[]> {
  const response = await request(`/offer/user/${encodeURIComponent(userId)}`, token, 'GET', undefined, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível carregar suas ofertas.')
  const data: unknown = await response.json().catch(() => null)
  if (!Array.isArray(data) || !data.every(isManagedOffer)) throw new Error('O servidor retornou dados de ofertas inválidos.')
  return data
}

export async function createOffer(token: string, data: NewOffer, baseUrl = configuredUrl): Promise<void> {
  const response = await request('/offer/create', token, 'POST', data, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível cadastrar a oferta.')
}

export async function updateOffer(token: string, id: string, data: OfferUpdate, baseUrl = configuredUrl): Promise<void> {
  const response = await request(`/offer/${encodeURIComponent(id)}`, token, 'PATCH', data, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível atualizar a oferta.')
}

export async function deleteOffer(token: string, id: string, baseUrl = configuredUrl): Promise<void> {
  const response = await request(`/offer/${encodeURIComponent(id)}`, token, 'DELETE', undefined, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível excluir a oferta.')
}

export async function fetchEditorPhotos(token: string, offerId: string, baseUrl = configuredUrl): Promise<EditorPhoto[]> {
  const response = await request(`/offerPhotos/offer/${encodeURIComponent(offerId)}`, token, 'GET', undefined, baseUrl)
  if (!response.ok) return responseError(response, 'Não foi possível carregar as fotos da oferta.')
  const data: unknown = await response.json().catch(() => null)
  return readEditorPhotos(data)
}

function readEditorPhotos(data: unknown): EditorPhoto[] {
  if (!Array.isArray(data) || !data.every(photo => photo && typeof photo.id === 'string' && typeof photo.imageUrl === 'string' && /^https?:\/\//i.test(photo.imageUrl) && typeof photo.description === 'string')) throw new Error('O servidor retornou fotos inválidas.')
  return data.map(photo => ({ ...photo, key: photo.id }))
}

export async function saveEditedOffer(token: string, id: string, data: ReturnType<typeof editorPayload>, baseUrl = configuredUrl): Promise<EditorPhoto[]> {
  const response = await request(`/offer/${encodeURIComponent(id)}/editor`, token, 'PUT', data, baseUrl)
  if (!response.ok) {
    if (response.status === 413) throw new Error('As fotos excedem o limite de envio. Use até 5 imagens de 3 MB cada.')
    if (response.status === 400) {
      const result = await response.json().catch(() => null)
      throw new Error(typeof result?.error === 'string' ? result.error : 'Confira os campos da oferta.')
    }
    return responseError(response, 'Não foi possível salvar a oferta. Suas alterações continuam nesta tela.')
  }
  const saved = await response.json().catch(() => null)
  return readEditorPhotos(saved?.photos)
}

export async function createOfferWithPhotos(token: string, data: ReturnType<typeof editorPayload>, baseUrl = configuredUrl): Promise<{ id: string; photos: EditorPhoto[] }> {
  const response = await request('/offer/editor', token, 'POST', data, baseUrl)
  if (!response.ok) {
    if (response.status === 413) throw new Error('Use até 5 fotos de 3 MB cada.')
    if (response.status === 400) {
      const result = await response.json().catch(() => null)
      throw new Error(typeof result?.error === 'string' ? result.error : 'Confira os campos da oferta.')
    }
    return responseError(response, 'Não foi possível cadastrar a oferta. Seus dados continuam nesta tela.')
  }
  const saved = await response.json().catch(() => null)
  if (typeof saved?.id !== 'string' || !/^[a-z0-9_-]{1,36}$/i.test(saved.id)) throw new Error('Não foi possível confirmar o cadastro. Verifique Minhas ofertas antes de tentar novamente.')
  return { id: saved.id, photos: readEditorPhotos(saved.photos) }
}
