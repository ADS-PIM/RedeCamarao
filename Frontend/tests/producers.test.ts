import assert from 'node:assert/strict'
import test from 'node:test'
import type { Producer } from '../src/data/producers.ts'
import { emptyProducerFilters, filterProducers, producerCities, producerHref, producerIdFromPath, producerLocation, sortProducers } from '../src/data/producers.ts'
import { fetchProducerProfile, fetchProducers } from '../src/services/producers.ts'

const base: Producer = { id: 'producer-1', name: 'Fazenda Mar Azul', description: 'Produção local', location: 'Fortim, CE', businessHours: null, activeOfferCount: 6 }
const producers: Producer[] = [base,
  { ...base, id: 'producer-2', name: 'Aquamar Pescados', location: 'Aracati, Ceará', activeOfferCount: 4 },
  { ...base, id: 'producer-3', name: 'Viveiro Boa Água', location: 'Mossoró, RN', activeOfferCount: 5 },
  { ...base, id: 'producer-4', name: 'Fazenda Sem Região', location: null, description: null, activeOfferCount: 0 },
]

test('localidade separa cidade e UF sem quebrar nomes com hífen ou inventar região', () => {
  assert.deepEqual(producerLocation('Fortim, CE'), { city: 'Fortim', state: 'CE', label: 'Fortim, Ceará' })
  assert.equal(producerLocation('Ceará-Mirim, RN').city, 'Ceará-Mirim')
  assert.equal(producerLocation('Aracati - Ceará').city, 'Aracati')
  assert.equal(producerLocation('Fortim CE').city, 'Fortim')
  assert.equal(producerLocation('Ceará').city, '')
  assert.deepEqual(producerLocation(null), { city: '', state: null, label: 'Localização não informada' })
})

test('cidades dependem do estado e não repetem variações de acento ou maiúsculas', () => {
  const duplicated = [...producers, { ...base, id: 'other', location: 'fortim, CE' }]
  assert.deepEqual(producerCities(duplicated, 'CE').map(city => city.value), ['aracati', 'fortim'])
  assert.deepEqual(producerCities(producers, 'RN').map(city => city.value), ['mossoro'])
  assert.deepEqual(producerCities(producers, 'PI'), [])
})

test('busca combina nome, estado e cidade, ignora acentos e inclui quem não tem ofertas', () => {
  assert.equal(filterProducers(producers, emptyProducerFilters).length, 4)
  assert.deepEqual(filterProducers(producers, { name: 'BOA AGUA', state: 'RN', city: 'mossoro' }).map(producer => producer.id), ['producer-3'])
  assert.deepEqual(filterProducers(producers, { name: 'fazenda', state: 'CE', city: 'fortim' }).map(producer => producer.id), ['producer-1'])
  assert.deepEqual(filterProducers(producers, { name: 'Boa Água', state: 'CE', city: '' }), [])
  assert.equal(filterProducers(producers, { ...emptyProducerFilters, name: 'sem regiao' })[0].activeOfferCount, 0)
})

test('ordenação usa nomes e ofertas reais e mantém a lista original', () => {
  assert.deepEqual(sortProducers(producers, 'offers-desc').map(producer => producer.id), ['producer-1', 'producer-3', 'producer-2', 'producer-4'])
  assert.equal(sortProducers(producers, 'name-asc')[0].id, 'producer-2')
  assert.equal(sortProducers(producers, 'name-desc')[0].id, 'producer-3')
  assert.equal(sortProducers(producers, 'relevant', 'aquamar')[0].id, 'producer-2')
  assert.equal(producers[0].id, 'producer-1')
})

test('rota pública do perfil aceita ID e barra final sem aceitar caminhos inválidos', () => {
  assert.equal(producerHref('producer-1'), '/produtores/producer-1')
  assert.equal(producerIdFromPath('/produtores/producer-1/'), 'producer-1')
  for (const path of ['/produtores', '/produtores/a/b', '/produtores/%', '/produtores/..', '/produtores/a%20b']) assert.equal(producerIdFromPath(path), null)
})

test('listagem e perfil usam endpoints públicos e preservam campos nulos e zero ofertas', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, 'https://api.example.test/users/producers')
    return Response.json(producers)
  })
  assert.deepEqual(await fetchProducers('https://api.example.test/'), producers)
  mock.mock.restore()
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, 'https://api.example.test/users/producers/producer-4')
    return Response.json({ producer: producers[3], offers: [] })
  })
  assert.deepEqual(await fetchProducerProfile('producer-4', 'https://api.example.test/'), { producer: producers[3], offers: [] })
})

test('API diferencia perfil inexistente, dados inválidos, servidor indisponível e falha de rede', async t => {
  const missing = t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 404 }))
  assert.equal(await fetchProducerProfile('missing', 'https://api.example.test'), null)
  missing.mock.restore()
  for (const invalid of [{}, [{ ...base, activeOfferCount: -1 }], [{ ...base, activeOfferCount: 1.5 }]]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(invalid))
    await assert.rejects(fetchProducers('https://api.example.test'), /dados de produtores inválidos/)
    mock.mock.restore()
  }
  const serverError = t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 500 }))
  await assert.rejects(fetchProducers('https://api.example.test'), /carregar os produtores/)
  serverError.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network') })
  await assert.rejects(fetchProducers('https://api.example.test'), /conectar ao servidor/)
})
