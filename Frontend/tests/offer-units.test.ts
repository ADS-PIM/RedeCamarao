import assert from 'node:assert/strict'
import test from 'node:test'
import { blankEditorValues, changeEditorUnit, editorPayload, initialEditorValues, validateEditor } from '../src/data/offerEditor.ts'
import { formatQuantity } from '../src/data/offerUnits.ts'

const offer = { id: 'one', title: 'Oferta teste', description: 'Camarão fresco', type: 'Cinza', size: 'M', price: 34.9, weight: 100, minimumQuantity: 0.5, maximumQuantity: 10, location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2027-01-01', status: 'ACTIVE' as const, createdAt: '2026-11-01' }

test('new and existing offers default to kg, including fractional amounts', () => {
  assert.equal(blankEditorValues().minimumQuantityUnit, 'kg')
  const values = initialEditorValues(offer)
  assert.equal(values.weight, '100'); assert.equal(values.weightUnit, 'kg')
  assert.equal(values.minimumQuantity, '0,5'); assert.equal(values.minimumQuantityUnit, 'kg')
  assert.deepEqual(validateEditor(values), {})
  assert.equal(editorPayload(values, [], true).offer.minimumQuantity, 0.5)
})
test('mixed units compare minimum, maximum and available stock in the same unit', () => {
  const values = { ...initialEditorValues(offer), minimumQuantity: '500', minimumQuantityUnit: 'g' as const, maximumQuantity: '1000', maximumQuantityUnit: 'g' as const }
  assert.deepEqual(validateEditor(values), {})
  assert.equal(editorPayload(values, [], true).offer.maximumQuantity, 1)
  assert(validateEditor({ ...values, maximumQuantity: '499' }).minimumQuantity)
  assert(validateEditor({ ...values, maximumQuantity: '100001' }).maximumQuantity)
})
test('unit changes convert amounts and price without changing the offer value', () => {
  const values = initialEditorValues(offer)
  const grams = changeEditorUnit(changeEditorUnit(values, 'weight', 'g'), 'price', 'g')
  assert.equal(grams.weight, '100000'); assert.equal(grams.price, '0,0349')
  assert.deepEqual(validateEditor(grams), {})
  assert.deepEqual(editorPayload(values, [], true), editorPayload(grams, [], true))
  const kilograms = changeEditorUnit(changeEditorUnit(grams, 'weight', 'kg'), 'price', 'kg')
  assert.deepEqual(editorPayload(kilograms, [], true), editorPayload(values, [], true))
})
test('supports one gram and rejects subgram quantities and invalid prices', () => {
  const values = { ...initialEditorValues(offer), minimumQuantity: '1', minimumQuantityUnit: 'g' as const }
  assert.equal(editorPayload(values, [], true).offer.minimumQuantity, 0.001)
  assert.deepEqual(validateEditor(values), {})
  assert(validateEditor({ ...values, minimumQuantity: '0,5' }).minimumQuantity)
  assert(validateEditor({ ...values, weight: '0,0001' }).weight)
  assert(validateEditor({ ...values, price: '1,234' }).price)
  assert(validateEditor({ ...values, priceUnit: 'g', price: '0,000001' }).price)
})
test('reopening a one gram offer preserves its quantities and display', () => {
  const values = initialEditorValues({ ...offer, weight: 0.501, minimumQuantity: 0.001, maximumQuantity: 0.499 })
  assert.equal(values.weight, '0,501'); assert.equal(values.minimumQuantity, '0,001')
  assert.equal(editorPayload(values, [], true).offer.maximumQuantity, 0.499)
  assert.equal(formatQuantity(0.001), '0,001 kg'); assert.equal(formatQuantity(0.5), '0,5 kg')
  assert.equal(formatQuantity(1.5), '1,5 kg')
})

test('accepts the requested kilogram quantities with comma or dot decimals', () => {
  for (const minimumQuantity of ['0,8', '0.8']) {
    const values = { ...initialEditorValues(offer), price: '34,90', weight: '300', minimumQuantity, maximumQuantity: '30' }
    assert.deepEqual(validateEditor(values), {})
    const saved = editorPayload(values, [], true).offer
    assert.equal(saved.price, 34.9); assert.equal(saved.weight, 300)
    assert.equal(saved.minimumQuantity, 0.8); assert.equal(saved.maximumQuantity, 30)
    assert.equal(formatQuantity(saved.minimumQuantity), '0,8 kg')
  }
})
