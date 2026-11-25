import { emptyCatalogSelection, shrimpTypeOptions, wholesaleMinimumKg, type CatalogSelection } from './catalogFilters.ts'
import { getOfferState } from './offerAttributes.ts'
import { sizeOptions } from './products.ts'
import type { Offer } from './marketplace.ts'
import { brazilianStates } from '../utils/registration.ts'

export type Shelf = NonNullable<Offer['shelf']>
export const shelfTitles = {
  featured: 'Ofertas disponíveis',
  wholesale: 'Lotes de Alto Volume (Atacado)',
  regional: 'Recém-publicados na Região',
}

export function matchesShelf(offer: Offer, shelf: Shelf, now: number) {
  if (shelf === 'wholesale') return offer.weight > wholesaleMinimumKg
  if (shelf === 'featured') return true
  const age = now - Date.parse(offer.createdAt ?? '')
  return age >= 0 && age <= 24 * 60 * 60 * 1000
}

export function filteredShelves(offers: Offer[], states: string[], now: number) {
  const featured = offers.slice(0, 4)
  const remaining = offers.slice(4)
  const regional = remaining.filter(offer => matchesShelf(offer, 'regional', now)
    && (!states.length || states.includes(getOfferState(offer.location) ?? '')))
  const regionalIds = new Set(regional.map(offer => offer.id))
  // Prefer non-overlapping lots so a large fresh lot can fill the regional row.
  const wholesale = remaining.filter(offer => matchesShelf(offer, 'wholesale', now))
    .sort((a, b) => Number(regionalIds.has(a.id)) - Number(regionalIds.has(b.id)) || b.weight - a.weight).slice(0, 4)
  const used = new Set(wholesale.map(offer => offer.id))
  return {
    featured, wholesale: wholesale.sort((a, b) => b.weight - a.weight),
    regional: regional.filter(offer => !used.has(offer.id)).sort((a, b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!)).slice(0, 4),
  }
}

export function catalogHref(shelf: Shelf, selection: CatalogSelection, query: string) {
  const params = new URLSearchParams()
  if (shelf !== 'featured') params.set('secao', shelf)
  if (query) params.set('q', query)
  for (const field of ['types', 'sizes', 'states'] as const) {
    for (const value of selection[field]) params.append(field, value)
  }
  if (selection.minQuantity) params.set('minQuantity', selection.minQuantity)
  if (selection.maxQuantity) params.set('maxQuantity', selection.maxQuantity)
  if ((selection.minQuantity || selection.maxQuantity) && selection.quantityUnit === 'g') params.set('unit', 'g')
  return params.size ? '/produtos?' + params : '/produtos'
}

export function readCatalogEntry(search: string) {
  const params = new URLSearchParams(search)
  const section = params.get('secao')
  const shelf: Shelf = section === 'wholesale' || section === 'regional' ? section : 'featured'
  const selection: CatalogSelection = {
    ...emptyCatalogSelection,
    types: shrimpTypeOptions.filter(item => params.getAll('types').includes(item.id)).map(item => item.id),
    sizes: sizeOptions.filter(item => params.getAll('sizes').includes(item.id)).map(item => item.id),
    states: brazilianStates.filter(item => params.getAll('states').includes(item.code)).map(item => item.code),
    minQuantity: params.get('minQuantity') ?? '', maxQuantity: params.get('maxQuantity') ?? '',
    quantityUnit: params.get('unit') === 'g' ? 'g' : 'kg',
  }
  return { shelf, selection, query: params.get('q')?.trim() ?? '' }
}
