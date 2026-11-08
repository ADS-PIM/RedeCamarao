import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDocument, formatPhone, isValidDocument, validateRegistration } from '../src/utils/registration.ts'

const validData = { name: 'Marina Souza', document: '529.982.247-25', email: 'marina@example.com', password: 'senha1234', confirmPassword: 'senha1234', terms: true, phone: '', location: '' }

test('aceita CPF e CNPJ com dígitos verificadores válidos', () => {
  assert.equal(isValidDocument('529.982.247-25'), true)
  assert.equal(isValidDocument('11.222.333/0001-81'), true)
})
test('rejeita documento incompleto, repetido ou com dígito incorreto', () => {
  for (const document of ['', '123', '111.111.111-11', '00.000.000/0000-00', '529.982.247-26', '11.222.333/0001-82', '123.456.789-00']) assert.equal(isValidDocument(document), false)
})
test('formata documento e telefone sem ultrapassar seus limites', () => {
  assert.equal(formatDocument('52998224725'), '529.982.247-25')
  assert.equal(formatDocument('11222333000181'), '11.222.333/0001-81')
  assert.equal(formatPhone('85999991234'), '(85) 99999-1234')
  assert.equal(formatPhone('8533331234'), '(85) 3333-1234')
})
test('contato é opcional e cadastro válido não apresenta erros', () => {
  assert.deepEqual(validateRegistration(validData), {})
})
test('exige confirmação, consentimento e contatos válidos quando preenchidos', () => {
  const errors = validateRegistration({ ...validData, confirmPassword: 'outrasenha', terms: false, phone: '123' })
  assert.ok(errors.confirmPassword)
  assert.ok(errors.terms)
  assert.ok(errors.phone)
})
