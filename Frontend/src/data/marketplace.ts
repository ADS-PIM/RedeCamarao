import { getOfferState } from './products.ts'
import { catalogSearchWords, matchesCatalogSearch, matchesCatalogFilters, normalizeSearch, validateCatalogQuantity, wholesaleMinimumKg } from './catalogFilters.ts'
import type { CatalogSelection } from './catalogFilters.ts'

export type Offer = {
  createdAt?: string
  shelf?: 'featured' | 'wholesale' | 'regional'
  coverPhoto?: string | null
  id: string
  title: string
  description: string
  type: string | null
  size: string
  price: number
  weight: number
  maximumQuantity: number
  minimumQuantity: number
  location: string
  startDate: string
  endDate: string
}

export type Category = 'gray' | 'white' | 'large' | 'bulk' | 'nearby'

export type OfferPhoto = { id: string; imageUrl: string; description: string | null }
export type OfferProducer = {
  id: string
  name: string
  description: string | null
  location: string | null
  businessHours: string | null
  profilePicture?: string | null
  activeOfferCount: number
}
export type OfferDetail = Offer & { createdAt: string; photos: OfferPhoto[]; producer: OfferProducer }

export function filterOffers(offers: Offer[], query: string, category: Category | CatalogSelection | null, region = '') {
  const selection = category && typeof category === 'object' ? category : null
  if (selection && validateCatalogQuantity(selection)) return []
  const words = catalogSearchWords(query)
  return offers.filter(offer => {
    const type = normalizeSearch(offer.type ?? '')
    const size = normalizeSearch(offer.size)
    return matchesCatalogSearch(offer, words)
      && (!selection || matchesCatalogFilters(offer, selection))
      && (category !== 'gray' || type.includes('cinza'))
      && (category !== 'white' || type.includes('branco'))
      && (category !== 'large' || size.includes('grande') || size.includes('large'))
      && (category !== 'bulk' || offer.weight > wholesaleMinimumKg)
      && (!region || getOfferState(offer.location) === region)
  })
}

export const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
