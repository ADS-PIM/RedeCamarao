import type { ManagedOffer, OfferStatus } from '../services/account.ts'

export const offerStatusNames: Record<OfferStatus, string> = {
  ACTIVE: 'Ativa', INACTIVE: 'Pausada', EXPIRED: 'Expirada', SOLD_OUT: 'Vendida', CANCELLED: 'Cancelada',
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
