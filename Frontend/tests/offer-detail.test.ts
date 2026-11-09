import assert from 'node:assert/strict'
import test from 'node:test'
import type { OfferDetail } from '../src/data/marketplace.ts'
import { fetchOfferDetail } from '../src/services/offers.ts'
import { offerGallery, offerHref, offerIdFromPath, readSavedOffers, relatedOffers, savedOffersKey, setOfferSaved } from '../src/data/offerDetail.ts'

const detail: OfferDetail = {
  id: 'offer-1', title: 'Camarão cinza fresco', description: 'Lote conservado em gelo', type: 'Camarão cinza',
  size: 'Médio', price: 34.9, weight: 80, minimumQuantity: 20, maximumQuantity: 80, location: 'Fortim, CE',
  startDate: '2026-11-01', endDate: '2026-12-01', createdAt: '2026-11-08T10:00:00Z',
  photos: [{ id: 'photo-1', imageUrl: 'https://images.example.test/shrimp.jpg', description: 'Lote anunciado' }],
  producer: { id: 'producer-1', name: 'Produtor de teste', description: null, location: 'Fortim, CE', phone: null, businessHours: null, activeOfferCount: 2 },
}

test('rota específica aceita ID e barra final e rejeita caminhos inválidos', () => {
  assert.equal(offerHref('offer-1'), '/produtos/offer-1')
  assert.equal(offerIdFromPath('/produtos/offer-1/'), 'offer-1')
  assert.equal(offerIdFromPath('/produtos'), null)
  for (const path of ['/produtos/a/b', '/produtos/%', '/produtos/%2F', '/produtos/..', '/produtos/a%20b', '/produtos/' + 'a'.repeat(37)]) {
    assert.equal(offerIdFromPath(path), null)
  }
})

test('detalhe usa endpoint público e aceita campos opcionais nulos', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, 'https://api.example.test/offer/marketplace/offer-1')
    return Response.json(detail)
  })
  assert.deepEqual(await fetchOfferDetail('offer-1', 'https://api.example.test/'), detail)
})

test('detalhe diferencia oferta inexistente, resposta inválida e falha de conexão', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 404 }))
  assert.equal(await fetchOfferDetail('missing', 'https://api.example.test'), null)
  mock.mock.restore()
  for (const value of [{ ...detail, producer: null }, { ...detail, createdAt: 'data inválida' },
    { ...detail, photos: [{ id: 'x', imageUrl: 'javascript:alert(1)', description: '' }] }]) {
    const invalid = t.mock.method(globalThis, 'fetch', async () => Response.json(value))
    await assert.rejects(fetchOfferDetail('offer-1', 'https://api.example.test'), /dados de oferta inválidos/)
    invalid.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network') })
  await assert.rejects(fetchOfferDetail('offer-1', 'https://api.example.test'), /conectar ao servidor/)
})

test('galeria usa fotos cadastradas e identifica o fallback como ilustrativo', () => {
  const photos = offerGallery(detail)
  assert.equal(photos[0].src, detail.photos[0].imageUrl)
  assert.equal(photos[0].illustrative, false)
  const fallback = offerGallery({ ...detail, photos: [] })
  assert.ok(fallback.length >= 3)
  assert.ok(fallback.every(photo => photo.illustrative))
  assert.equal(new Set(fallback.map(photo => photo.src)).size, fallback.length)
})

test('relacionados excluem a oferta atual, removem duplicatas e priorizam localização', () => {
  const city = { ...detail, id: 'city' }
  const state = { ...detail, id: 'state', location: 'Aracati, CE' }
  const elsewhere = { ...detail, id: 'elsewhere', location: 'Mossoró, RN' }
  assert.deepEqual(relatedOffers(detail, [elsewhere, detail, state, city, city]).map(offer => offer.id), ['city', 'state', 'elsewhere'])
})

test('salvar mantém somente IDs e preserva outras ofertas sem gravar dados de sessão', () => {
  let stored = JSON.stringify(['other', 'other', 15, null])
  const storage = { getItem: (key: string) => { assert.equal(key, savedOffersKey); return stored }, setItem: (_key: string, value: string) => { stored = value } }
  assert.deepEqual(readSavedOffers(storage), ['other'])
  setOfferSaved(storage, detail.id, true)
  assert.deepEqual(JSON.parse(stored), ['other', detail.id])
  setOfferSaved(storage, detail.id, false)
  assert.deepEqual(JSON.parse(stored), ['other'])
  assert.deepEqual(readSavedOffers({ getItem: () => 'JSON inválido' }), [])
  assert.throws(() => setOfferSaved({ ...storage, setItem: () => { throw new Error('blocked') } }, detail.id, true), /blocked/)
})
