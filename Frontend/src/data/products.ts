import type { Offer } from './marketplace'
import { brazilianStates } from '../utils/registration.ts'

export const sizeOptions = [
  { id: 'small', label: 'Pequeno (8–10 cm)' },
  { id: 'medium', label: 'Médio (11–14 cm)' },
  { id: 'large', label: 'Grande (15–18 cm)' },
  { id: 'extra-large', label: 'Extra grande (+18 cm)' },
] as const

export const quantityOptions = [
  { id: 'up-to-25', label: 'Até 25 kg' },
  { id: '25-to-50', label: 'De 25 a 50 kg' },
  { id: '50-to-100', label: 'De 50 a 100 kg' },
  { id: 'over-100', label: 'Mais de 100 kg' },
] as const

export type SizeFilter = typeof sizeOptions[number]['id']
export type QuantityFilter = typeof quantityOptions[number]['id']
export type ProductSort = 'recent' | 'price-asc' | 'price-desc' | 'quantity-desc'
export type ProductFilters = {
  location: string
  states: string[]
  minPrice: string
  maxPrice: string
  sizes: SizeFilter[]
  quantities: QuantityFilter[]
}

export const emptyProductFilters: ProductFilters = {
  location: '', states: [], minPrice: '', maxPrice: '', sizes: [], quantities: [],
}
export const productsPerPage = 6
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function getOfferState(location: string) {
  const code = location.trim().match(/(?:^|[\s,/–-])([a-z]{2})$/i)?.[1].toUpperCase()
  if (code && brazilianStates.some(state => state.code === code)) return code
  const normalized = normalize(location)
  return brazilianStates.find(state => normalized === normalize(state.name)
    || new RegExp(`[,/–-]\\s*${normalize(state.name)}$`).test(normalized))?.code ?? null
}

export function getOfferSize(size: string): SizeFilter | null {
  const value = normalize(size)
  if (value.includes('extra') || value.includes('jumbo') || value === 'gg') return 'extra-large'
  if (/\b(pequen[oa]|small)\b/.test(value) || value === 'p') return 'small'
  if (/\b(medi[oa]|medium)\b/.test(value) || value === 'm') return 'medium'
  if (/\b(grande|large)\b/.test(value) || value === 'g') return 'large'
  return null
}

export function getQuantityBand(weight: number): QuantityFilter {
  if (weight <= 25) return 'up-to-25'
  if (weight <= 50) return '25-to-50'
  if (weight <= 100) return '50-to-100'
  return 'over-100'
}

export function parseProductPrice(value: string): number | null {
  const cleaned = value.replace(/^\s*R\$\s*/i, '').trim()
  if (!cleaned) return null
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(cleaned)) return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  return /^\d+(?:[.,]\d{1,2})?$/.test(cleaned) ? Number(cleaned.replace(',', '.')) : NaN
}

export function validateProductPrices(filters: ProductFilters): { field: 'minPrice' | 'maxPrice'; message: string } | null {
  const minimum = parseProductPrice(filters.minPrice)
  const maximum = parseProductPrice(filters.maxPrice)
  if (minimum !== null && !Number.isFinite(minimum)) return { field: 'minPrice', message: 'Informe um preço mínimo válido, como 25,90.' }
  if (maximum !== null && !Number.isFinite(maximum)) return { field: 'maxPrice', message: 'Informe um preço máximo válido, como 50,00.' }
  if (minimum !== null && maximum !== null && minimum > maximum) return { field: 'maxPrice', message: 'O preço máximo deve ser igual ou maior que o mínimo.' }
  return null
}

export function filterProductOffers(offers: Offer[], query: string, filters: ProductFilters) {
  if (validateProductPrices(filters)) return []
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const location = normalize(filters.location)
  const locationState = getOfferState(filters.location)
  const minimum = parseProductPrice(filters.minPrice)
  const maximum = parseProductPrice(filters.maxPrice)
  return offers.filter(offer => {
    const state = getOfferState(offer.location)
    const stateName = brazilianStates.find(item => item.code === state)?.name ?? ''
    const searchable = normalize(`${offer.title} ${offer.description} ${offer.type ?? ''} ${offer.size} ${offer.location} ${stateName} ${offer.weight} kg`)
    const size = getOfferSize(offer.size)
    return words.every(word => searchable.includes(word))
      && (!location || (locationState ? locationState === state : location.split(/\s+/).every(word => normalize(offer.location).includes(word))))
      && (!filters.states.length || (state !== null && filters.states.includes(state)))
      && (minimum === null || offer.price >= minimum)
      && (maximum === null || offer.price <= maximum)
      && (!filters.sizes.length || (size !== null && filters.sizes.includes(size)))
      && (!filters.quantities.length || filters.quantities.includes(getQuantityBand(offer.weight)))
  })
}

export function sortProductOffers(offers: Offer[], sort: ProductSort) {
  // The public API already returns the newest offers first (createdAt DESC).
  const sorted = [...offers]
  if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
  if (sort === 'quantity-desc') sorted.sort((a, b) => b.weight - a.weight)
  return sorted
}

export function productPagination(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  if (current <= 3) [2, 3, 4].forEach(page => pages.add(page))
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach(page => pages.add(page))
  const sorted = [...pages].filter(page => page > 0 && page <= total).sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous && page - previous === 2) result.push(previous + 1)
    else if (previous && page - previous > 2) result.push('ellipsis')
    result.push(page)
  })
  return result
}
