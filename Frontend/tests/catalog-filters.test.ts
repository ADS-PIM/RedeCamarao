import assert from 'node:assert/strict'
import test from 'node:test'
import { changeCatalogUnit, emptyCatalogSelection, validateCatalogQuantity } from '../src/data/catalogFilters.ts'
import { filterOffers } from '../src/data/marketplace.ts'
import { emptyProductFilters, filterProductOffers } from '../src/data/products.ts'

const base = { id: 'gray-small', title: 'Lote fresco', description: 'Camarão selecionado', type: 'Camarão cinza', size: 'Pequeno (8–10 cm)', weight: 0.5, price: 35, minimumQuantity: 0.001, maximumQuantity: 0.5, location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2027-01-01' }
const offers = [base, { ...base, id: 'white-large', type: 'Camarão branco', size: 'Grande (15–18 cm)', weight: 1, location: 'Mossoró, RN' }, { ...base, id: 'gray-extra', size: 'Extra grande (+18 cm)', weight: 50 }, { ...base, id: 'other', type: null, weight: 100 }]

test('tipos e tamanhos aceitam várias opções e combinam com múltiplos estados', () => {
  const filters = { ...emptyCatalogSelection, types: ['gray', 'white'] as const, sizes: ['small', 'large'] as const, states: ['CE', 'RN'] }
  const selection = { ...filters, types: [...filters.types], sizes: [...filters.sizes] }
  assert.deepEqual(filterOffers(offers, '', selection).map(item => item.id), ['gray-small', 'white-large'])
  assert.deepEqual(filterOffers(offers, '', { ...selection, states: ['RN'] }).map(item => item.id), ['white-large'])
  assert.deepEqual(filterOffers(offers, '', { ...emptyCatalogSelection, sizes: ['large'] }).map(item => item.id), ['white-large'])
  assert.deepEqual(filterOffers(offers, '', { ...emptyCatalogSelection, types: ['other'] }).map(item => item.id), ['other'])
})

test('limites inclusivos em gramas e kg produzem os mesmos resultados, junto à busca', () => {
  const kilograms = { ...emptyCatalogSelection, minQuantity: '0,5', maxQuantity: '1' }
  const grams = changeCatalogUnit(kilograms, 'g')
  assert.equal(grams.minQuantity, '500'); assert.equal(grams.maxQuantity, '1000')
  assert.deepEqual(filterOffers(offers, '', grams), filterOffers(offers, '', kilograms))
  assert.deepEqual(filterOffers(offers, 'branco', grams).map(item => item.id), ['white-large'])
  assert.deepEqual(changeCatalogUnit(grams, 'kg'), kilograms)
  assert.equal(filterOffers(offers, '', { ...emptyCatalogSelection, maxQuantity: '0,5' }).length, 1)
  assert.equal(filterOffers(offers, '', emptyCatalogSelection).length, offers.length)
})

test('intervalos inválidos e frações de grama são explicados sem retornar resultados enganosos', () => {
  for (const invalid of [{ minQuantity: 'abc' }, { minQuantity: '-1' }, { minQuantity: '2', maxQuantity: '1' }, { minQuantity: '0,0001' }]) {
    const filters = { ...emptyCatalogSelection, ...invalid }
    assert(validateCatalogQuantity(filters))
    assert.deepEqual(filterOffers(offers, '', filters), [])
  }
  assert(validateCatalogQuantity({ ...emptyCatalogSelection, quantityUnit: 'g', minQuantity: '0,5' }))
  assert.equal(validateCatalogQuantity({ ...emptyCatalogSelection, minQuantity: '0' }), null)
})

test('página de ofertas usa as mesmas combinações e aplica também a faixa de preço', () => {
  const filters = { ...emptyProductFilters, types: ['gray', 'white'] as ('gray' | 'white')[], minQuantity: '500', maxQuantity: '1000', quantityUnit: 'g' as const, minPrice: '34', maxPrice: '36' }
  assert.deepEqual(filterProductOffers(offers, '', filters).map(item => item.id), ['gray-small', 'white-large'])
  assert.deepEqual(filterProductOffers(offers, '', { ...filters, states: ['RN'] }).map(item => item.id), ['white-large'])
  assert.deepEqual(filterProductOffers(offers, '', { ...filters, maxQuantity: '499' }), [])
})
