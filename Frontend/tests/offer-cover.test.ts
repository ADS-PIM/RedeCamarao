import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchMarketplaceOffers, isOffer } from '../src/services/offers.ts'
import { fetchProducerProfile } from '../src/services/producers.ts'
const offer = { id: 'offer-1', title: 'Camarão', description: 'Lote real', type: 'Cinza', size: 'M', price: 34.9, weight: 300, minimumQuantity: 0.8, maximumQuantity: 30, location: 'Fortim, CE', startDate: '2026-01-01', endDate: '2030-01-01', coverPhoto: 'https://res.cloudinary.com/test/image/upload/v1/first.jpg' }
test('catalog preserves the saved cover URL for the product card', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json([offer]))
  assert.equal((await fetchMarketplaceOffers('https://api.example.test'))[0].coverPhoto, offer.coverPhoto)
})
test('producer catalog preserves the saved cover URL', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ producer: { id: 'producer-1', name: 'Produtor', description: null, location: null, phone: null, businessHours: null, activeOfferCount: 1 }, offers: [offer] }))
  assert.equal((await fetchProducerProfile('producer-1', 'https://api.example.test'))?.offers[0].coverPhoto, offer.coverPhoto)
})
test('accepts missing covers and rejects invalid cover values', () => {
  assert(isOffer({ ...offer, coverPhoto: null })); assert(isOffer({ ...offer, coverPhoto: undefined }))
  for (const value of [false, {}, '', 'javascript:alert(1)']) assert.equal(isOffer({ ...offer, coverPhoto: value }), false)
})
