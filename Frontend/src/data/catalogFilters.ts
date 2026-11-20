import type { Offer } from './marketplace.ts'
import { getOfferSize, getOfferState } from './offerAttributes.ts'
import type { SizeFilter } from './products.ts'
import { parseMeasuredValue } from './offerUnits.ts'
import type { WeightUnit } from './offerUnits.ts'

export const shrimpTypeOptions = [
  { id: 'gray', label: 'Camarão cinza' },
  { id: 'white', label: 'Camarão branco' },
  { id: 'other', label: 'Outros tipos' },
] as const
export type ShrimpTypeFilter = typeof shrimpTypeOptions[number]['id']
export type CatalogSelection = {
  types: ShrimpTypeFilter[]
  sizes: SizeFilter[]
  states: string[]
  minQuantity: string
  maxQuantity: string
  quantityUnit: WeightUnit
}
export const emptyCatalogSelection: CatalogSelection = {
  types: [], sizes: [], states: [], minQuantity: '', maxQuantity: '', quantityUnit: 'kg',
}

export function getShrimpType(type: string | null): ShrimpTypeFilter {
  const text = (type ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return text.includes('cinza') ? 'gray' : text.includes('branco') ? 'white' : 'other'
}

export function quantityInKg(value: string, unit: WeightUnit): number | null {
  if (!value.trim()) return null
  const number = parseMeasuredValue(value, unit === 'g' ? 0 : 3)
  return unit === 'g' ? number / 1000 : number
}

export function validateCatalogQuantity(filters: CatalogSelection): { field: 'minQuantity' | 'maxQuantity'; message: string } | null {
  for (const field of ['minQuantity', 'maxQuantity'] as const) {
    const number = quantityInKg(filters[field], filters.quantityUnit)
    if (number !== null && (!Number.isFinite(number) || number < 0 || number > 99999999.99)) {
      return { field, message: filters.quantityUnit === 'g' ? 'Informe uma quantidade em gramas inteiras, a partir de zero.' : 'Informe uma quantidade em kg com até três casas decimais.' }
    }
  }
  const minimum = quantityInKg(filters.minQuantity, filters.quantityUnit)
  const maximum = quantityInKg(filters.maxQuantity, filters.quantityUnit)
  return minimum !== null && maximum !== null && minimum > maximum
    ? { field: 'maxQuantity', message: 'O lote máximo deve ser igual ou maior que o mínimo.' } : null
}

export function changeCatalogUnit<T extends CatalogSelection>(filters: T, unit: WeightUnit): T {
  if (unit === filters.quantityUnit) return filters
  const convert = (value: string) => {
    const kg = quantityInKg(value, filters.quantityUnit)
    return kg === null || !Number.isFinite(kg) ? value : String(Number((unit === 'g' ? kg * 1000 : kg).toFixed(unit === 'g' ? 0 : 3))).replace('.', ',')
  }
  return { ...filters, quantityUnit: unit, minQuantity: convert(filters.minQuantity), maxQuantity: convert(filters.maxQuantity) }
}

export function matchesCatalogFilters(offer: Offer, filters: CatalogSelection): boolean {
  const size = getOfferSize(offer.size)
  const state = getOfferState(offer.location)
  const minimum = quantityInKg(filters.minQuantity, filters.quantityUnit)
  const maximum = quantityInKg(filters.maxQuantity, filters.quantityUnit)
  return (!filters.types.length || filters.types.includes(getShrimpType(offer.type)))
    && (!filters.sizes.length || size !== null && filters.sizes.includes(size))
    && (!filters.states.length || state !== null && filters.states.includes(state))
    && (minimum === null || offer.weight >= minimum)
    && (maximum === null || offer.weight <= maximum)
}
