import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyCatalogSelection } from '../src/data/catalogFilters.ts'
import { filterOffers, type Offer } from '../src/data/marketplace.ts'
import { emptyProductFilters, filterProductOffers } from '../src/data/products.ts'
import { catalogHref, filteredShelves, matchesShelf, readCatalogEntry } from '../src/data/showcase.ts'

const now = Date.UTC(2026, 10, 25, 15)
const day = 86400000
function lot(id: string, weight = 300, age = 2 * day, location = 'Fortaleza, CE'): Offer {
  return { id, title: id, description: '', type: null, size: 'Grande', price: 40, weight, location,
    minimumQuantity: 1, maximumQuantity: weight, startDate: '2026-11-20', endDate: '2026-12-01',
    createdAt: new Date(now - age).toISOString() }
}

test('a vitrine mantém os destaques e distribui até 12 lotes distintos nos recortes corretos', () => {
  const featured = ['a', 'b', 'c', 'd'].map(id => lot(id))
  const bulk = ['e', 'f', 'g', 'h'].map(id => lot(id, 500.001))
  const fresh = ['i', 'j', 'k', 'l'].map(id => lot(id, 600, day))
  const rows = filteredShelves([...featured, ...fresh, lot('outro estado', 500, 0, 'Natal, RN'), ...bulk], ['CE'], now)
  assert.deepEqual(rows, { featured, wholesale: bulk, regional: fresh })
  assert.equal(matchesShelf(lot('limite', 500), 'wholesale', now), false)
  assert.equal(matchesShelf(lot('antiga', 300, day + 1), 'regional', now), false)
  assert.equal(matchesShelf(lot('futura', 300, -1), 'regional', now), false)
})

test('Ver todas preserva seção, busca, regiões e unidade de quantidade', () => {
  const selection = { ...emptyCatalogSelection, states: ['RN', 'CE'], minQuantity: '550', quantityUnit: 'g' as const }
  const href = catalogHref('regional', selection, 'camarão')
  const entry = readCatalogEntry(new URL(href, 'https://example.org').search)
  assert.deepEqual(entry, { shelf: 'regional', selection: { ...selection, states: ['CE', 'RN'] }, query: 'camarão' })
  assert.equal(catalogHref('featured', emptyCatalogSelection, ''), '/produtos')
})

test('busca por estado mantém os lotes elegíveis ao abrir Ver todas', () => {
  const lots = [
    lot('atacado', 501, day), lot('limite', 500, day), lot('antigo', 501, day + 1),
    lot('por extenso', 501, 0, 'Natal, Rio Grande do Norte'),
  ]
  const selection = { ...emptyCatalogSelection, minQuantity: '500000', quantityUnit: 'g' as const, states: ['CE', 'RN'] }
  for (const [query, shelf, expected] of [
    ['ceara', 'wholesale', ['atacado', 'antigo']], ['Ceará', 'regional', ['atacado', 'limite']],
    ['RN', 'regional', ['por extenso']],
  ] as const) {
    const home = filterOffers(lots, query, selection).filter(offer => matchesShelf(offer, shelf, now))
    const entry = readCatalogEntry(new URL(catalogHref(shelf, selection, query), 'https://example.org').search)
    const catalog = filterProductOffers(lots.filter(offer => matchesShelf(offer, entry.shelf, now)),
      entry.query, { ...emptyProductFilters, ...entry.selection })
    assert.deepEqual(home.map(offer => offer.id), expected)
    assert.deepEqual(catalog, home)
  }
})
