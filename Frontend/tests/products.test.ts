import assert from 'node:assert/strict'
import test from 'node:test'
import type { Offer } from '../src/data/marketplace.ts'
import { emptyProductFilters, filterProductOffers, getOfferSize, getOfferState, getQuantityBand, parseProductPrice, productPagination, sortProductOffers, validateProductPrices } from '../src/data/products.ts'

const base: Offer = {
  id: '1', title: 'Camarão cinza fresco', description: 'Conservado em gelo', type: 'Camarão cinza',
  size: 'Médio (11–14 cm)', price: 34.9, weight: 80, minimumQuantity: 10, maximumQuantity: 80,
  location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2026-12-01',
}
const offers: Offer[] = [
  base,
  { ...base, id: '2', title: 'Camarão branco selecionado', type: 'Camarão branco', size: 'Grande (15–18 cm)', price: 38.5, weight: 40, location: 'Aracati, CE' },
  { ...base, id: '3', title: 'Camarão cinza resfriado', size: 'Pequeno (8–10 cm)', price: 31, weight: 25, location: 'Mossoró, RN' },
  { ...base, id: '4', title: 'Lote premium', size: 'Extra grande (+18 cm)', price: 42, weight: 120, location: 'Recife, Pernambuco' },
]

test('localização reconhece UF e nome de estado sem confundir cidades e estados', () => {
  assert.equal(getOfferState('Fortim, CE'), 'CE')
  assert.equal(getOfferState('Ceará-Mirim, RN'), 'RN')
  assert.equal(getOfferState('Ceará-Mirim'), null)
  assert.equal(getOfferState('Recife - Pernambuco'), 'PE')
  assert.equal(getOfferState('Belém, PA'), 'PA')
  assert.equal(getOfferState('Paraná'), 'PR')
  assert.equal(getOfferState('Aracati'), null)
})

test('busca ignora acentos e filtros combinam grupos sem alterar as ofertas originais', () => {
  assert.equal(filterProductOffers(offers, 'camarao ceara', emptyProductFilters).length, 2)
  assert.deepEqual(filterProductOffers(offers, '', { ...emptyProductFilters, location: 'Ceará' }).map(item => item.id), ['1', '2'])
  assert.deepEqual(filterProductOffers(offers, '', { ...emptyProductFilters, location: 'mossoro' }).map(item => item.id), ['3'])
  const filters = { ...emptyProductFilters, states: ['CE', 'PE'], sizes: ['medium', 'extra-large'] as const,
    quantities: ['50-to-100', 'over-100'] as const, minPrice: '30,00', maxPrice: '40,00' }
  assert.deepEqual(filterProductOffers(offers, 'gelo', { ...filters, sizes: [...filters.sizes], quantities: [...filters.quantities] }).map(item => item.id), ['1'])
  assert.equal(offers.length, 4)
})

test('tamanhos não confundem grande com extra grande e quantidades não têm lacunas', () => {
  assert.equal(getOfferSize('Extra grande (+18 cm)'), 'extra-large')
  assert.equal(getOfferSize('Grande (15–18 cm)'), 'large')
  assert.equal(getOfferSize('Médio'), 'medium')
  assert.equal(getOfferSize('GG'), 'extra-large')
  assert.equal(getOfferSize('A classificar'), null)
  assert.deepEqual([25, 25.5, 50, 50.5, 100, 100.1].map(getQuantityBand), ['up-to-25', '25-to-50', '25-to-50', '50-to-100', '50-to-100', 'over-100'])
})

test('preços aceitam o formato brasileiro, validam intervalos e incluem os limites', () => {
  assert.equal(parseProductPrice('R$ 1.234,56'), 1234.56)
  assert.equal(parseProductPrice('34,90'), 34.9)
  assert.equal(parseProductPrice('34.90'), 34.9)
  assert.equal(parseProductPrice(''), null)
  for (const invalid of ['-1', 'abc', '1,2,3', 'Infinity']) assert.equal(validateProductPrices({ ...emptyProductFilters, minPrice: invalid })?.field, 'minPrice')
  assert.equal(validateProductPrices({ ...emptyProductFilters, minPrice: '50', maxPrice: '20' })?.field, 'maxPrice')
  assert.deepEqual(filterProductOffers(offers, '', { ...emptyProductFilters, minPrice: '34,90', maxPrice: '38,50' }).map(item => item.id), ['1', '2'])
})

test('ordenação preserva a ordem recente da API e não modifica o array recebido', () => {
  assert.deepEqual(sortProductOffers(offers, 'recent').map(item => item.id), ['1', '2', '3', '4'])
  assert.deepEqual(sortProductOffers(offers, 'price-asc').map(item => item.id), ['3', '1', '2', '4'])
  assert.deepEqual(sortProductOffers(offers, 'price-desc').map(item => item.id), ['4', '2', '1', '3'])
  assert.deepEqual(sortProductOffers(offers, 'quantity-desc').map(item => item.id), ['4', '1', '2', '3'])
  assert.deepEqual(offers.map(item => item.id), ['1', '2', '3', '4'])
})

test('paginação mostra páginas existentes e reticências conforme a posição atual', () => {
  assert.deepEqual(productPagination(1, 1), [1])
  assert.deepEqual(productPagination(2, 3), [1, 2, 3])
  assert.deepEqual(productPagination(1, 12), [1, 2, 3, 4, 'ellipsis', 12])
  assert.deepEqual(productPagination(6, 12), [1, 'ellipsis', 5, 6, 7, 'ellipsis', 12])
  assert.deepEqual(productPagination(12, 12), [1, 'ellipsis', 9, 10, 11, 12])
})
