import type { ManagedOffer, OfferStatus } from '../services/account.ts'

export const offerStatusNames: Record<OfferStatus, string> = {
  ACTIVE: 'Ativa', INACTIVE: 'Pausada', EXPIRED: 'Expirada', SOLD_OUT: 'Vendida', CANCELLED: 'Cancelada', DRAFT: 'Rascunho',
}
export const localDateString = (offsetDays = 0, now = new Date()) => {
  const date = new Date(now)
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function filterManagedOffers(offers: ManagedOffer[], search: string, status: OfferStatus | 'ALL') {
  const words = normalize(search).split(/\s+/).filter(Boolean)
  return offers.filter(offer => (status === 'ALL' || offer.status === status)
    && words.every(word => normalize(`${offer.title} ${offer.location} ${offer.id} ${offer.type ?? ''}`).includes(word)))
}

export function isPublishedOffer(offer: ManagedOffer, today = localDateString()) {
  return offer.status === 'ACTIVE' && offer.startDate.slice(0, 10) <= today && offer.endDate.slice(0, 10) >= today
}

export function canActivateOffer(offer: ManagedOffer, today = localDateString()) {
  return offer.status === 'INACTIVE' && offer.endDate.slice(0, 10) >= today
}

export type ManagedOfferTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'CLOSED'
export type ManagedOfferSort = 'recent' | 'oldest' | 'price-asc' | 'quantity-desc'
export function selectManagedOffers(offers: ManagedOffer[], query: string, tab: ManagedOfferTab, sort: ManagedOfferSort) {
  const matching = filterManagedOffers(offers, query, tab === 'CLOSED' ? 'ALL' : tab)
    .filter(offer => tab !== 'CLOSED' || ['EXPIRED', 'SOLD_OUT', 'CANCELLED'].includes(offer.status))
  return matching.sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price || a.id.localeCompare(b.id)
    if (sort === 'quantity-desc') return b.weight - a.weight || a.id.localeCompare(b.id)
    const dates = Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt)
    return (sort === 'oldest' ? -dates : dates) || a.id.localeCompare(b.id)
  })
}
