import type { ManagedOffer } from '../services/account.ts'
import { producerLocation } from './producers.ts'
import { parseProductPrice } from './products.ts'
import { brazilianStates } from '../utils/registration.ts'
import { localDateString } from './account.ts'

export type OfferEditorValues = {
  title: string; description: string; type: string; size: string; price: string; weight: string;
  minimumQuantity: string; maximumQuantity: string; city: string; state: string;
  startDate: string; endDate: string; available: boolean
}
export type EditorPhoto = { key: string; id?: string; data?: string; imageUrl: string; description: string }
export function editOfferHref(id: string) { return `/painel/ofertas/${encodeURIComponent(id)}/editar` }
export const newOfferHref = '/painel/ofertas/nova'
export const myOffersHref = '/painel/ofertas'
export function blankEditorValues(location: string | null = null): OfferEditorValues {
  const parsed = producerLocation(location)
  return { title: '', description: '', type: '', size: '', price: '', weight: '', minimumQuantity: '', maximumQuantity: '',
    city: parsed.city, state: parsed.state ?? '', startDate: localDateString(), endDate: localDateString(7), available: true }
}
export function editOfferIdFromPath(pathname: string) {
  const match = pathname.match(/^\/painel\/ofertas\/([a-z0-9_-]{1,36})\/editar\/?$/i)
  return match?.[1] ?? null
}
export function initialEditorValues(offer: ManagedOffer): OfferEditorValues {
  const location = producerLocation(offer.location)
  const number = (value: number) => String(value).replace('.', ',')
  return { title: offer.title, description: offer.description, type: offer.type ?? '', size: offer.size,
    price: offer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), weight: number(offer.weight), minimumQuantity: number(offer.minimumQuantity), maximumQuantity: number(offer.maximumQuantity),
    city: location.city, state: location.state ?? '', startDate: offer.startDate.slice(0, 10), endDate: offer.endDate.slice(0, 10), available: offer.status === 'ACTIVE' }
}
export function validateEditor(values: OfferEditorValues) {
  const errors: Partial<Record<keyof OfferEditorValues, string>> = {}
  for (const key of ['title', 'description', 'type', 'size', 'city'] as const) {
    if (!values[key].trim()) errors[key] = 'Preencha este campo.'
  }
  if (values.title.length > 255) errors.title = 'Use até 255 caracteres.'
  if (values.description.length > 1000) errors.description = 'Use até 1.000 caracteres.'
  if (!brazilianStates.some(state => state.code === values.state)) errors.state = 'Selecione um estado.'
  for (const key of ['price', 'weight', 'minimumQuantity', 'maximumQuantity'] as const) {
    const number = parseProductPrice(values[key])
    if (number === null || !Number.isFinite(number) || number <= 0 || number > 99999999.99) errors[key] = 'Informe um valor positivo com até duas casas decimais.'
  }
  if (!errors.maximumQuantity && !errors.minimumQuantity && Number(parseProductPrice(values.minimumQuantity)) > Number(parseProductPrice(values.maximumQuantity))) errors.minimumQuantity = 'A mínima não pode exceder a máxima.'
  if (!errors.maximumQuantity && !errors.weight && Number(parseProductPrice(values.maximumQuantity)) > Number(parseProductPrice(values.weight))) errors.maximumQuantity = 'A máxima não pode exceder o lote disponível.'
  for (const key of ['startDate', 'endDate'] as const) {
    const date = new Date(values[key])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values[key]) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== values[key]) errors[key] = 'Informe uma data válida.'
  }
  if (!errors.startDate && !errors.endDate && values.endDate < values.startDate) errors.endDate = 'A data final não pode ser anterior à inicial.'
  return errors
}
export function editorPayload(values: OfferEditorValues, photos: EditorPhoto[], publish: boolean | 'DRAFT') {
  return { offer: { title: values.title.trim(), description: values.description.trim(), type: values.type.trim(), size: values.size.trim(),
    price: parseProductPrice(values.price)!, weight: parseProductPrice(values.weight)!, minimumQuantity: parseProductPrice(values.minimumQuantity)!, maximumQuantity: parseProductPrice(values.maximumQuantity)!,
    location: `${values.city.trim()}, ${values.state}`, startDate: values.startDate, endDate: values.endDate, status: publish === 'DRAFT' ? 'DRAFT' as const : publish ? 'ACTIVE' as const : 'INACTIVE' as const },
    photos: photos.map(photo => ({ ...(photo.id ? { id: photo.id } : { data: photo.data }), description: photo.description })) }
}
