import type { Offer, OfferDetail } from '../data/marketplace'

const configuredUrl = import.meta.env?.VITE_API_URL

export function isOffer(value: unknown): value is Offer {
  if (!value || typeof value !== 'object') return false
  const offer = value as Record<string, unknown>
  return typeof offer.id === 'string'
    && typeof offer.title === 'string'
    && typeof offer.description === 'string'
    && (typeof offer.type === 'string' || offer.type === null)
    && typeof offer.size === 'string'
    && typeof offer.price === 'number'
    && typeof offer.weight === 'number'
    && typeof offer.maximumQuantity === 'number'
    && typeof offer.minimumQuantity === 'number'
    && typeof offer.location === 'string'
    && typeof offer.startDate === 'string'
    && typeof offer.endDate === 'string'
}

function isOfferDetail(value: unknown): value is OfferDetail {
  if (!isOffer(value)) return false
  const detail = value as unknown as Record<string, unknown>
  const producer = detail.producer as Record<string, unknown> | null
  const nullableText = (value: unknown) => value === null || typeof value === 'string'
  return typeof detail.createdAt === 'string' && Number.isFinite(Date.parse(detail.createdAt))
    && Array.isArray(detail.photos) && detail.photos.every(photo => {
      if (!photo || typeof photo !== 'object') return false
      try {
        return typeof photo.id === 'string' && typeof photo.imageUrl === 'string'
          && ['http:', 'https:'].includes(new URL(photo.imageUrl).protocol) && nullableText(photo.description)
      } catch { return false }
    })
    && Boolean(producer && typeof producer === 'object'
      && typeof producer.id === 'string' && typeof producer.name === 'string'
      && nullableText(producer.description) && nullableText(producer.location)
      && nullableText(producer.phone) && nullableText(producer.businessHours)
      && typeof producer.activeOfferCount === 'number' && Number.isInteger(producer.activeOfferCount) && producer.activeOfferCount >= 0)
}

export async function fetchOfferDetail(id: string, baseUrl = configuredUrl): Promise<OfferDetail | null> {
  if (!baseUrl) throw new Error('O acesso à oferta está temporariamente indisponível.')
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/offer/marketplace/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) })
  } catch { throw new Error('Não foi possível conectar ao servidor. Tente novamente mais tarde.') }
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Não foi possível carregar esta oferta. Tente novamente mais tarde.')
  const data: unknown = await response.json().catch(() => null)
  if (!isOfferDetail(data)) throw new Error('O servidor retornou dados de oferta inválidos.')
  return data
}

export async function fetchMarketplaceOffers(baseUrl = configuredUrl): Promise<Offer[]> {
  if (!baseUrl) throw new Error('O acesso às ofertas está temporariamente indisponível.')

  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/offer/marketplace`, {
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente mais tarde.')
  }

  if (!response.ok) throw new Error('Não foi possível carregar as ofertas. Tente novamente mais tarde.')

  const data: unknown = await response.json().catch(() => null)
  if (!Array.isArray(data) || !data.every(isOffer)) {
    throw new Error('O servidor retornou dados de ofertas inválidos.')
  }

  return data
}
