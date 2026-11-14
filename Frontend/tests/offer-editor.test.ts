import assert from 'node:assert/strict'
import test from 'node:test'
import { editOfferHref, editOfferIdFromPath, initialEditorValues, validateEditor, editorPayload } from '../src/data/offerEditor.ts'
import { fetchEditorPhotos, saveEditedOffer } from '../src/services/account.ts'
const offer = { id: 'offer-1', title: 'Camarão fresco', description: 'Lote selecionado', type: 'Camarão cinza', size: 'Médio', price: 34.9, weight: 80, minimumQuantity: 20, maximumQuantity: 80, location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2027-01-01', status: 'ACTIVE' as const, createdAt: '2026-11-01' }

test('rota de edição é privada e aceita somente um identificador válido', () => {
  assert.equal(editOfferHref('offer-1'), '/painel/ofertas/offer-1/editar')
  assert.equal(editOfferIdFromPath('/painel/ofertas/offer-1/editar/'), 'offer-1')
  for (const path of ['/produtos/offer-1', '/painel/ofertas/a/b/editar', '/painel/ofertas/../editar', '/painel/ofertas/%20/editar']) assert.equal(editOfferIdFromPath(path), null)
})
test('campos preservam dados do lote e aceitam preço brasileiro sem perder os limites', () => {
  const values = initialEditorValues(offer)
  assert.equal(values.price, '34,90')
  assert.deepEqual(validateEditor(values), {})
  const payload = editorPayload({ ...values, price: 'R$ 1.234,56' }, [], false)
  assert.equal(payload.offer.price, 1234.56)
  assert.equal(payload.offer.maximumQuantity, 80)
  assert.equal(payload.offer.location, 'Fortim, CE')
  assert.equal(payload.offer.status, 'INACTIVE')
})
test('validação rejeita datas inexistentes, intervalos invertidos e quantidades incoerentes', () => {
  const values = initialEditorValues(offer)
  assert(validateEditor({ ...values, endDate: '2026-02-30' }).endDate)
  assert(validateEditor({ ...values, endDate: '2026-01-01' }).endDate)
  assert(validateEditor({ ...values, price: '0' }).price)
  assert(validateEditor({ ...values, price: '3,999' }).price)
  assert(validateEditor({ ...values, maximumQuantity: '90' }).maximumQuantity)
  assert(validateEditor({ ...values, minimumQuantity: '81' }).minimumQuantity)
  assert(validateEditor({ ...values, state: '' }).state)
})
test('salvamento envia apenas IDs das fotos existentes e dados dos novos arquivos na ordem escolhida', async t => {
  const values = initialEditorValues(offer)
  const photos = [{ key: 'local', imageUrl: 'data:image/png;base64,AA==', data: 'data:image/png;base64,AA==', description: 'Nova capa' }, { key: 'photo-1', id: 'photo-1', imageUrl: 'https://example.test/old.jpg', description: 'Foto atual' }]
  const payload = editorPayload(values, photos, true)
  assert.deepEqual(payload.photos, [{ data: photos[0].data, description: 'Nova capa' }, { id: 'photo-1', description: 'Foto atual' }])
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    assert.equal(url, 'https://api.example.test/offer/offer-1/editor')
    assert.equal(init?.method, 'PUT')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer token')
    assert.deepEqual(JSON.parse(String(init?.body)), payload)
    return Response.json({ photos: [{ id: 'new-id', imageUrl: 'https://api.example.test/uploads/photo.png', description: 'Nova capa' }] })
  })
  assert.equal((await saveEditedOffer('token', 'offer-1', payload, 'https://api.example.test'))[0].key, 'new-id')
})
test('fotos e salvamento distinguem sessão expirada, tamanho excessivo e dados inválidos', async t => {
  const unauthorized = t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 401 }))
  await assert.rejects(fetchEditorPhotos('token', 'offer-1', 'https://api.example.test'), /sessão expirou/)
  unauthorized.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 413 }))
  await assert.rejects(saveEditedOffer('token', 'offer-1', editorPayload(initialEditorValues(offer), [], false), 'https://api.example.test'), /limite de envio/)
})
