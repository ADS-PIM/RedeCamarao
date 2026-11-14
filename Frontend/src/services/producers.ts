import type { Producer, ProducerProfile } from '../data/producers'
import { isOffer } from './offers.ts'

const configuredUrl = import.meta.env?.VITE_API_URL
function isProducer(value: unknown): value is Producer {
  if (!value || typeof value !== 'object') return false
  const producer = value as Record<string, unknown>
  const nullableText = (value: unknown) => value === null || typeof value === 'string'
  return typeof producer.id === 'string' && Boolean(producer.id) && typeof producer.name === 'string'
    && nullableText(producer.description) && nullableText(producer.location) && nullableText(producer.phone) && nullableText(producer.businessHours)
    && (producer.profilePicture === undefined || producer.profilePicture === null || typeof producer.profilePicture === 'string' && /^https?:\/\//i.test(producer.profilePicture))
    && typeof producer.activeOfferCount === 'number' && Number.isInteger(producer.activeOfferCount) && producer.activeOfferCount >= 0
}

async function request(path: string, baseUrl?: string) {
  if (!baseUrl) throw new Error('O acesso aos produtores está temporariamente indisponível.')
  try { return await fetch(`${baseUrl.replace(/\/+$/, '')}/users/producers${path}`, { signal: AbortSignal.timeout(15000) }) }
  catch { throw new Error('Não foi possível conectar ao servidor. Tente novamente mais tarde.') }
}

export async function fetchProducers(baseUrl = configuredUrl): Promise<Producer[]> {
  const response = await request('', baseUrl)
  if (!response.ok) throw new Error('Não foi possível carregar os produtores. Tente novamente mais tarde.')
  const data: unknown = await response.json().catch(() => null)
  if (!Array.isArray(data) || !data.every(isProducer)) throw new Error('O servidor retornou dados de produtores inválidos.')
  return data
}

export async function fetchProducerProfile(id: string, baseUrl = configuredUrl): Promise<ProducerProfile | null> {
  const response = await request(`/${encodeURIComponent(id)}`, baseUrl)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Não foi possível carregar este produtor. Tente novamente mais tarde.')
  const data = await response.json().catch(() => null)
  if (!data || !isProducer(data.producer) || !Array.isArray(data.offers) || !data.offers.every(isOffer)) throw new Error('O servidor retornou dados de produtor inválidos.')
  return { producer: data.producer, offers: data.offers }
}
