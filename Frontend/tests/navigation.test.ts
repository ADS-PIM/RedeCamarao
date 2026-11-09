import assert from 'node:assert/strict'
import test from 'node:test'
import { getInternalDestination } from '../src/utils/navigation.ts'

const current = 'https://redecamarao.example/marketplace'
const click = { button: 0, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }
const link = { href: '/registro', target: '', download: false }

test('navegação interna mantém caminho, parâmetros e âncoras', () => {
  assert.equal(getInternalDestination(click, link, current)?.href, 'https://redecamarao.example/registro')
  assert.equal(getInternalDestination(click, { ...link, href: '/marketplace?regiao=CE#ofertas' }, current)?.href,
    'https://redecamarao.example/marketplace?regiao=CE#ofertas')
  assert.equal(getInternalDestination(click, { ...link, href: '#main-content', target: '_self' }, current)?.hash, '#main-content')
})

test('cliques modificados e já tratados mantêm o comportamento do navegador', () => {
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey', 'defaultPrevented']) {
    assert.equal(getInternalDestination({ ...click, [modifier]: true }, link, current), null)
  }
  for (const button of [1, 2]) assert.equal(getInternalDestination({ ...click, button }, link, current), null)
})

test('downloads e links com outro destino não são interceptados', () => {
  assert.equal(getInternalDestination(click, { ...link, download: true }, current), null)
  for (const target of ['_blank', '_parent', '_top', 'outra-janela']) {
    assert.equal(getInternalDestination(click, { ...link, target }, current), null)
  }
})

test('links externos, protocolos especiais e URLs inválidas ficam com o navegador', () => {
  for (const href of ['https://outro.example/registro', 'http://redecamarao.example/registro',
    'https://redecamarao.example:8080/registro', 'mailto:contato@example.test', 'tel:85999999999', 'http://[']) {
    assert.equal(getInternalDestination(click, { ...link, href }, current), null)
  }
})
