import type { Offer, OfferDetail } from './marketplace'
import { getOfferSize, getOfferState } from './products.ts'

export function offerHref(id: string) { return `/produtos/${encodeURIComponent(id)}` }

export function offerIdFromPath(pathname: string) {
  const match = pathname.match(/^\/produtos\/([^/]+)\/?$/)
  if (!match) return null
  try {
    const id = decodeURIComponent(match[1])
    return /^[a-z0-9_-]{1,36}$/i.test(id) ? id : null
  } catch { return null }
}

export function offerIllustration(offer: Offer) {
  if ((offer.type ?? '').toLowerCase().includes('branco')) return '/images/shrimp-white.jpg'
  if (getOfferSize(offer.size) === 'extra-large') return '/images/shrimp-premium.jpg'
  return offer.weight > 50 ? '/images/shrimp-gray.jpg' : '/images/shrimp-fresh.jpg'
}

export type GalleryPhoto = { id: string; src: string; description: string; illustrative: boolean }
export function offerGallery(offer: OfferDetail): GalleryPhoto[] {
  if (offer.photos.length) return offer.photos.map(photo => ({
    id: photo.id, src: photo.imageUrl, description: photo.description || `Foto do lote: ${offer.title}`, illustrative: false,
  }))
  return [...new Set([offerIllustration(offer), '/images/shrimp-fresh.jpg', '/images/shrimp-premium.jpg', '/images/shrimp-farm.jpg'])]
    .map((src, index) => ({ id: `illustration-${index}`, src, description: 'Foto ilustrativa; não representa este lote', illustrative: true }))
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export function relatedOffers(offer: Offer, offers: Offer[], limit = 4) {
  const state = getOfferState(offer.location)
  const seen = new Set([offer.id])
  const score = (item: Offer) => (normalize(item.location) === normalize(offer.location) ? 8 : 0)
    + (state && state === getOfferState(item.location) ? 4 : 0)
    + (item.type && offer.type && normalize(item.type) === normalize(offer.type) ? 2 : 0)
  return offers.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })
    .sort((a, b) => score(b) - score(a)).slice(0, limit)
}

export const savedOffersKey = 'rede-camarao:saved-offers'
type SavedStorage = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
export function readSavedOffers(storage: Pick<SavedStorage, 'getItem'>): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(savedOffersKey) ?? '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 36))] : []
  } catch { return [] }
}

export function setOfferSaved(storage: SavedStorage, id: string, saved: boolean) {
  const ids = readSavedOffers(storage).filter(value => value !== id)
  if (saved) ids.push(id)
  storage.setItem(savedOffersKey, JSON.stringify(ids))
}
