import type { Offer } from '../data/marketplace'

const configuredUrl = import.meta.env.VITE_API_URL

function isOffer(value: unknown): value is Offer {
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
