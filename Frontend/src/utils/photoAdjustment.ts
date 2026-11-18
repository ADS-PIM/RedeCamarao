export type PhotoAdjustment = { zoom: number; horizontal: number; vertical: number }
export type ImageSize = { width: number; height: number }
export const initialPhotoAdjustment: PhotoAdjustment = { zoom: 100, horizontal: 50, vertical: 50 }
export const minimumZoom = 100
export const maximumZoom = 400
export const offerPhotoAspect = 1.9

const percent = (value: number, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Math.round(value)))

export function normalizePhotoAdjustment(value: PhotoAdjustment): PhotoAdjustment {
  return { zoom: percent(value.zoom, minimumZoom, maximumZoom), horizontal: percent(value.horizontal), vertical: percent(value.vertical) }
}

export function zoomWithWheel(zoom: number, deltaY: number) {
  return percent(zoom + (deltaY < 0 ? 5 : deltaY > 0 ? -5 : 0), minimumZoom, maximumZoom)
}

export function photoGeometry(image: ImageSize, frame: ImageSize, adjustment: PhotoAdjustment) {
  const settings = normalizePhotoAdjustment(adjustment)
  const scale = Math.max(frame.width / image.width, frame.height / image.height) * settings.zoom / 100
  const width = image.width * scale
  const height = image.height * scale
  const overflowX = Math.max(0, width - frame.width)
  const overflowY = Math.max(0, height - frame.height)
  const left = -overflowX * settings.horizontal / 100
  const top = -overflowY * settings.vertical / 100
  return { width, height, left, top, overflowX, overflowY,
    sourceX: -left / scale, sourceY: -top / scale, sourceWidth: frame.width / scale, sourceHeight: frame.height / scale }
}

export function dragPhoto(image: ImageSize, frame: ImageSize, start: PhotoAdjustment, deltaX: number, deltaY: number): PhotoAdjustment {
  const geometry = photoGeometry(image, frame, start)
  return normalizePhotoAdjustment({ ...start,
    horizontal: geometry.overflowX > .01 ? start.horizontal - deltaX / geometry.overflowX * 100 : start.horizontal,
    vertical: geometry.overflowY > .01 ? start.vertical - deltaY / geometry.overflowY * 100 : start.vertical,
  })
}

export async function exportAdjustedPhoto(image: HTMLImageElement, adjustment: PhotoAdjustment, aspect: number): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = aspect === 1 ? 768 : 1140
  canvas.height = Math.round(canvas.width / aspect)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a foto. Tente novamente.')
  const crop = photoGeometry({ width: image.naturalWidth, height: image.naturalHeight }, canvas, adjustment)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, 0, 0, canvas.width, canvas.height)
  const format = /^data:image\/png[;,]|\.png(?:[?#]|$)/i.test(image.src) ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível aplicar o ajuste da foto.')), format, .92)
  })
  if (blob.size > 10 * 1024 * 1024) throw new Error('A imagem ajustada excede 10 MB. Escolha outra foto.')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a foto ajustada.'))
    reader.readAsDataURL(blob)
  })
}
