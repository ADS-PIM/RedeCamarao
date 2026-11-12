import assert from 'node:assert/strict'
import test from 'node:test'
import { createOffer, deleteOffer, fetchMyOffers, fetchMyProfile, updateMyProfile, updateOffer } from '../src/services/account.ts'

const profile = {
  name: 'Fazenda Mar Azul', email: 'contato@example.test', userType: 'PRODUCER' as const,
  description: null, location: 'Fortim, CE', phone: null, businessHours: null, createdAt: '2026-01-01T10:00:00.000Z',
}
const offer = {
  id: 'offer-1', title: 'Camarão fresco', type: 'Camarão cinza', size: 'Médio',
  price: 34.9, weight: 80, location: 'Fortim, CE', startDate: '2026-11-01',
  endDate: '2026-12-01', status: 'ACTIVE' as const,
}
const api = 'https://api.example.test'

test('conta consulta perfil e ofertas com a identidade autenticada', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    assert.equal(init?.headers && new Headers(init.headers).get('Authorization'), 'Bearer token')
    if (url === `${api}/users/me`) return Response.json(profile)
    assert.equal(url, `${api}/offer/user/user%2Fid`)
    return Response.json([offer])
  })
  assert.deepEqual(await fetchMyProfile('token', api), profile)
  assert.deepEqual(await fetchMyOffers('token', 'user/id', api), [offer])
  mock.mock.restore()
})

test('perfil e ofertas exigem os formatos de resposta da API', async t => {
  const badProfile = t.mock.method(globalThis, 'fetch', async () => Response.json({ ...profile, userType: 'ADMIN' }))
  await assert.rejects(fetchMyProfile('token', api), /dados de conta inválidos/)
  badProfile.mock.restore()
  const badOffers = t.mock.method(globalThis, 'fetch', async () => Response.json([{ ...offer, status: 'PENDING' }]))
  await assert.rejects(fetchMyOffers('token', 'user-1', api), /dados de ofertas inválidos/)
  badOffers.mock.restore()
})

test('escritas enviam métodos, corpo e IDs codificados', async t => {
  const calls: { url: string; method: string; body: string | null }[] = []
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : null })
    return new Response(null, { status: 200 })
  })
  await updateMyProfile('token', { name: profile.name, email: profile.email, description: null, location: profile.location, phone: null, businessHours: null }, api)
  await createOffer('token', {
    title: 'Camarão fresco', description: 'Lote do dia', type: 'Cinza', size: 'Médio',
    price: 34.9, weight: 80, maximumQuantity: 80, minimumQuantity: 10,
    location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2026-12-01',
  }, api)
  await updateOffer('token', 'offer/id', { status: 'INACTIVE' }, api)
  await deleteOffer('token', 'offer/id', api)
  assert.deepEqual(calls.map(call => [call.url, call.method]), [
    [`${api}/users/me`, 'PATCH'], [`${api}/offer/create`, 'POST'],
    [`${api}/offer/offer%2Fid`, 'PATCH'], [`${api}/offer/offer%2Fid`, 'DELETE'],
  ])
  assert.deepEqual(JSON.parse(calls[2].body ?? '{}'), { status: 'INACTIVE' })
})

test('erros de autenticação e servidor ficam explícitos', async t => {
  const unauthorized = t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 401 }))
  await assert.rejects(fetchMyProfile('token', api), /sessão expirou/)
  unauthorized.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 500 }))
  await assert.rejects(deleteOffer('token', 'offer-1', api), /excluir a oferta/)
})
