import { getOfferState } from './products.ts'

export type Offer = {
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
  phone: string | null
  businessHours: string | null
  activeOfferCount: number
}
export type OfferDetail = Offer & { createdAt: string; photos: OfferPhoto[]; producer: OfferProducer }

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function filterOffers(offers: Offer[], query: string, category: Category | null, region: string) {
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean)
  return offers.filter(offer => {
    const text = normalize(`${offer.title} ${offer.description} ${offer.type ?? ''} ${offer.location} ${offer.size} ${offer.weight} kg`)
    const type = normalize(offer.type ?? '')
    const size = normalize(offer.size)
    return words.every(word => text.includes(word))
      && (category !== 'gray' || type.includes('cinza'))
      && (category !== 'white' || type.includes('branco'))
      && (category !== 'large' || size.includes('grande') || size.includes('large'))
      && (category !== 'bulk' || offer.weight > 50)
      && (!region || getOfferState(offer.location) === region)
  })
}

export const formatPrice = (price: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

export function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
