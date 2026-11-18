import assert from 'node:assert/strict'
import test from 'node:test'
import { blankEditorValues, changeEditorUnit, editorPayload, initialEditorValues, validateEditor } from '../src/data/offerEditor.ts'
import { formatQuantity } from '../src/data/offerUnits.ts'

const offer = { id: 'one', title: 'Oferta teste', description: 'Camarão fresco', type: 'Cinza', size: 'M', price: 34.9, weight: 100, minimumQuantity: 0.5, maximumQuantity: 10, location: 'Fortim, CE', startDate: '2026-11-01', endDate: '2027-01-01', status: 'ACTIVE' as const, createdAt: '2026-11-01' }

test('new offers default to kg; existing fractional amounts open as grams', () => {
  assert.equal(blankEditorValues().minimumQuantityUnit, 'kg')
  const values = initialEditorValues(offer)
  assert.equal(values.weight, '100'); assert.equal(values.weightUnit, 'kg')
  assert.equal(values.minimumQuantity, '500'); assert.equal(values.minimumQuantityUnit, 'g')
  assert.deepEqual(validateEditor(values), {})
  assert.equal(editorPayload(values, [], true).offer.minimumQuantity, 0.5)
})
test('mixed units compare minimum, maximum and available stock in the same unit', () => {
  const values = { ...initialEditorValues(offer), minimumQuantity: '500', maximumQuantity: '1000', maximumQuantityUnit: 'g' as const }
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
  const values = { ...initialEditorValues(offer), minimumQuantity: '1' }
  assert.equal(editorPayload(values, [], true).offer.minimumQuantity, 0.001)
  assert.deepEqual(validateEditor(values), {})
  assert(validateEditor({ ...values, minimumQuantity: '0,5' }).minimumQuantity)
  assert(validateEditor({ ...values, weight: '0,0001' }).weight)
  assert(validateEditor({ ...values, price: '1,234' }).price)
  assert(validateEditor({ ...values, priceUnit: 'g', price: '0,000001' }).price)
})
test('reopening a one gram offer preserves its quantities and display', () => {
  const values = initialEditorValues({ ...offer, weight: 0.501, minimumQuantity: 0.001, maximumQuantity: 0.499 })
  assert.equal(values.weight, '501'); assert.equal(values.minimumQuantity, '1')
  assert.equal(editorPayload(values, [], true).offer.maximumQuantity, 0.499)
  assert.equal(formatQuantity(0.001), '1 g'); assert.equal(formatQuantity(0.5), '500 g')
  assert.equal(formatQuantity(1.5), '1,5 kg')
})
