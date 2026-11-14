import assert from 'node:assert/strict'
import test from 'node:test'
import { filterOffers } from '../src/data/marketplace.ts'
import type { Offer } from '../src/data/marketplace.ts'

const base: Offer = { id: 'ce', title: 'Camarão fresco', description: 'Lote selecionado', type: 'Camarão cinza', size: 'Grande', price: 35, weight: 80, minimumQuantity: 10, maximumQuantity: 80, location: 'Fortim, CE', startDate: '2026-01-01', endDate: '2027-01-01' }
const offers = [base, { ...base, id: 'rn', location: 'Ceará-Mirim, RN' }, { ...base, id: 'pi', location: 'Cajueiro da Praia, Piauí', type: 'Camarão branco' }]

test('região combina com categoria e busca e reconhece estados além de CE e RN', () => {
  assert.deepEqual(filterOffers(offers, '', null, 'PI').map(item => item.id), ['pi'])
  assert.deepEqual(filterOffers(offers, 'FRESCO', 'white', 'PI').map(item => item.id), ['pi'])
  assert.deepEqual(filterOffers(offers, '', 'gray', 'PI'), [])
  assert.deepEqual(filterOffers(offers, 'selecionado', 'bulk', 'RN').map(item => item.id), ['rn'])
})

test('nome da cidade não é confundido com o estado e remover região restaura o catálogo', () => {
  assert.deepEqual(filterOffers(offers, '', null, 'CE').map(item => item.id), ['ce'])
  assert.equal(filterOffers(offers, '', null, '').length, 3)
  assert.deepEqual(filterOffers(offers, '', 'nearby', 'RN').map(item => item.id), ['rn'])
  assert.equal(offers.length, 3)
})
