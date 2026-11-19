import assert from 'node:assert/strict'
import test from 'node:test'
import { blankEditorValues, editorPayload } from '../src/data/offerEditor.ts'
import { createOfferWithPhotos, saveEditedOffer } from '../src/services/account.ts'

const payload = editorPayload(blankEditorValues(), [], true)

test('cadastro e edição mostram a falha no envio de fotos retornada pela API', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Não foi possível armazenar a foto. Tente novamente.' }, { status: 503 }))
  await assert.rejects(createOfferWithPhotos('token', payload, 'https://api.example.test'), /armazenar a foto/)
  await assert.rejects(saveEditedOffer('token', 'offer-1', payload, 'https://api.example.test'), /armazenar a foto/)
})

test('falha de fotos sem JSON mostra orientação e erros internos continuam protegidos', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response('Service unavailable', { status: 503 }))
  await assert.rejects(createOfferWithPhotos('token', payload, 'https://api.example.test'), /envio das fotos/)
  await assert.rejects(saveEditedOffer('token', 'offer-1', payload, 'https://api.example.test'), /envio das fotos/)
  fetchMock.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Sensitive database details' }, { status: 500 }))
  await assert.rejects(saveEditedOffer('token', 'offer-1', payload, 'https://api.example.test'), /Suas alterações continuam nesta tela/)
})
