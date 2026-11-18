import assert from 'node:assert/strict'
import test from 'node:test'
import { dragPhoto, initialPhotoAdjustment, normalizePhotoAdjustment, offerPhotoAspect, photoGeometry, zoomWithWheel } from '../src/utils/photoAdjustment.ts'

test('wheel changes zoom by five percentage points regardless of wheel magnitude', () => {
  assert.equal(zoomWithWheel(100, -1), 105)
  assert.equal(zoomWithWheel(101, -120), 106)
  assert.equal(zoomWithWheel(106, 120), 101)
  assert.equal(zoomWithWheel(125, 0), 125)
  assert.equal(zoomWithWheel(100, 120), 100)
  assert.equal(zoomWithWheel(398, -120), 400)
})
test('manual percentages preserve one-point increments and remain bounded', () => {
  assert.deepEqual(normalizePhotoAdjustment({ zoom: 101, horizontal: 51, vertical: 49 }), { zoom: 101, horizontal: 51, vertical: 49 })
  assert.deepEqual(normalizePhotoAdjustment({ zoom: 999, horizontal: -10, vertical: 200 }), { zoom: 400, horizontal: 0, vertical: 100 })
})
test('profile crop covers a circular viewport and uses the center by default', () => {
  const crop = photoGeometry({ width: 1600, height: 800 }, { width: 300, height: 300 }, initialPhotoAdjustment)
  assert.equal(crop.width, 600); assert.equal(crop.height, 300)
  assert.equal(crop.sourceX, 400); assert.equal(crop.sourceWidth, 800)
  assert.equal(crop.sourceY, 0); assert.equal(crop.sourceHeight, 800)
})
test('drag follows the pointer and stops at image edges without exposing empty space', () => {
  const image = { width: 1600, height: 800 }; const frame = { width: 300, height: 300 }
  assert.equal(dragPhoto(image, frame, initialPhotoAdjustment, 30, 10).horizontal, 40)
  assert.equal(dragPhoto(image, frame, initialPhotoAdjustment, 30, 10).vertical, 50)
  assert.equal(dragPhoto(image, frame, initialPhotoAdjustment, 10000, 0).horizontal, 0)
  assert.equal(dragPhoto(image, frame, initialPhotoAdjustment, -10000, 0).horizontal, 100)
})
test('offer crop preview and exported image select the same source rectangle at any viewport size', () => {
  const settings = { zoom: 173, horizontal: 23, vertical: 79 }
  for (const image of [{ width: 600, height: 1200 }, { width: 2000, height: 600 }]) {
    const preview = photoGeometry(image, { width: 380, height: 380 / offerPhotoAspect }, settings)
    const output = photoGeometry(image, { width: 1140, height: 600 }, settings)
    for (const key of ['sourceX', 'sourceY', 'sourceWidth', 'sourceHeight'] as const) assert(Math.abs(preview[key] - output[key]) < .00001)
    assert(output.sourceX >= 0 && output.sourceY >= 0)
    assert(output.sourceX + output.sourceWidth <= image.width + .00001)
    assert(output.sourceY + output.sourceHeight <= image.height + .00001)
  }
})
test('zoom on a square photo enables dragging in both directions and reset restores the whole image', () => {
  const image = { width: 1000, height: 1000 }; const frame = { width: 300, height: 300 }
  const shifted = dragPhoto(image, frame, { ...initialPhotoAdjustment, zoom: 200 }, 30, -30)
  assert.deepEqual(shifted, { zoom: 200, horizontal: 40, vertical: 60 })
  const reset = photoGeometry(image, frame, initialPhotoAdjustment)
  assert.equal(reset.sourceWidth, 1000); assert.equal(reset.sourceHeight, 1000)
})
