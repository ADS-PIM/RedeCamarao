import type { Producer, ProducerProfile } from '../data/producers.ts'
import { isOffer } from './offers.ts'
import { apiBaseUrl } from './api.ts'

function isProducer(value: unknown): value is Producer {
  if (!value || typeof value !== 'object') return false
  const producer = value as Record<string, unknown>
  const nullableText = (value: unknown) => value === null || typeof value === 'string'
  return typeof producer.id === 'string' && Boolean(producer.id) && typeof producer.name === 'string'
    && nullableText(producer.description) && nullableText(producer.location) && nullableText(producer.businessHours)
    && (producer.profilePicture === undefined || producer.profilePicture === null || typeof producer.profilePicture === 'string' && /^https?:\/\//i.test(producer.profilePicture))
    && typeof producer.activeOfferCount === 'number' && Number.isInteger(producer.activeOfferCount) && producer.activeOfferCount >= 0
}

async function request(path: string, baseUrl?: string) {
  if (!baseUrl) throw new Error('O acesso aos produtores está temporariamente indisponível.')
  try { return await fetch(`${baseUrl.replace(/\/+$/, '')}/users/producers${path}`, { signal: AbortSignal.timeout(15000) }) }
  catch { throw new Error('Não foi possível conectar ao servidor. Tente novamente mais tarde.') }
}

export async function fetchProducers(baseUrl = apiBaseUrl): Promise<Producer[]> {
  const response = await request('', baseUrl)
  if (!response.ok) throw new Error('Não foi possível carregar os produtores. Tente novamente mais tarde.')
  const data: unknown = await response.json().catch(() => null)
  if (!Array.isArray(data) || !data.every(isProducer)) throw new Error('O servidor retornou dados de produtores inválidos.')
  return data
}

export async function fetchProducerProfile(id: string, baseUrl = apiBaseUrl): Promise<ProducerProfile | null> {
  const response = await request(`/${encodeURIComponent(id)}`, baseUrl)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Não foi possível carregar este produtor. Tente novamente mais tarde.')
  const data = await response.json().catch(() => null)
  if (!data || !isProducer(data.producer) || !Array.isArray(data.offers) || !data.offers.every(isOffer)) throw new Error('O servidor retornou dados de produtor inválidos.')
  return { producer: data.producer, offers: data.offers }
}

export async function fetchProducerWhatsAppPhone(id: string, token: string, baseUrl = apiBaseUrl): Promise<string> {
  if (!baseUrl) throw new Error('O acesso aos contatos está temporariamente indisponível.')
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/users/producers/${encodeURIComponent(id)}/contact`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
  }
  if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  if (response.status === 404) throw new Error('Este produtor ainda não informou um telefone válido para WhatsApp.')
  if (response.status === 429) throw new Error('Você consultou muitos contatos. Aguarde alguns minutos e tente novamente.')
  if (!response.ok) throw new Error('Não foi possível carregar o contato do produtor. Tente novamente.')

  const data: unknown = await response.json().catch(() => null)
  if (!data || typeof data !== 'object' || typeof (data as Record<string, unknown>).phone !== 'string' || !(data as Record<string, string>).phone.trim()) {
    throw new Error('O servidor retornou um contato inválido.')
  }
  return (data as Record<string, string>).phone
}
