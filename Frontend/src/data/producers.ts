import type { Offer } from './marketplace'
import { getOfferState } from './products.ts'
import { brazilianStates } from '../utils/registration.ts'

export type Producer = {
  id: string
  name: string
  description: string | null
  location: string | null
  businessHours: string | null
  activeOfferCount: number
}
export type ProducerProfile = { producer: Producer; offers: Offer[] }
export type ProducerFilters = { name: string; state: string; city: string }
export type ProducerSort = 'relevant' | 'name-asc' | 'name-desc' | 'offers-desc'
export const emptyProducerFilters: ProducerFilters = { name: '', state: '', city: '' }
export const producersPerPage = 6
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export function producerHref(id: string) { return `/produtores/${encodeURIComponent(id)}` }
export function producerIdFromPath(pathname: string) {
  const match = pathname.match(/^\/produtores\/([^/]+)\/?$/)
  if (!match) return null
  try { const id = decodeURIComponent(match[1]); return /^[a-z0-9_-]{1,36}$/i.test(id) ? id : null }
  catch { return null }
}

export function producerLocation(location: string | null) {
  const raw = location?.trim() ?? ''
  const state = raw ? getOfferState(raw) : null
  const stateName = brazilianStates.find(item => item.code === state)?.name ?? ''
  let city = raw
  if (state) {
    if (normalize(raw) === normalize(stateName) || raw.toUpperCase() === state) city = ''
    else {
      const parts = raw.split(/\s*[,/–]\s*|\s+-\s+/)
      if (parts.length > 1 && getOfferState(parts.at(-1)!) === state) city = parts.slice(0, -1).join(', ')
      else city = raw.replace(new RegExp(`\\s+${state}$`, 'i'), '').trim()
    }
  }
  return { city, state, label: city && stateName ? `${city}, ${stateName}` : stateName || raw || 'Localização não informada' }
}

export function producerCities(producers: Producer[], state: string) {
  const cities = new Map<string, string>()
  producers.forEach(producer => {
    const location = producerLocation(producer.location)
    if (location.city && (!state || location.state === state)) cities.set(normalize(location.city), location.city)
  })
  return [...cities].map(([value, label]) => ({ value, label })).sort((a, b) => collator.compare(a.label, b.label))
}

export function filterProducers(producers: Producer[], filters: ProducerFilters) {
  const words = normalize(filters.name).split(' ').filter(Boolean)
  return producers.filter(producer => {
    const location = producerLocation(producer.location)
    return words.every(word => normalize(producer.name).includes(word))
      && (!filters.state || location.state === filters.state)
      && (!filters.city || normalize(location.city) === normalize(filters.city))
  })
}

export function sortProducers(producers: Producer[], sort: ProducerSort, query = '') {
  const searched = normalize(query)
  const relevance = (producer: Producer) => searched && normalize(producer.name) === searched ? 2
    : searched && normalize(producer.name).startsWith(searched) ? 1 : 0
  return [...producers].sort((a, b) => {
    if (sort === 'name-asc') return collator.compare(a.name, b.name)
    if (sort === 'name-desc') return collator.compare(b.name, a.name)
    if (sort === 'relevant' && relevance(a) !== relevance(b)) return relevance(b) - relevance(a)
    return b.activeOfferCount - a.activeOfferCount || collator.compare(a.name, b.name)
  })
}

export function producerIllustration(id: string) {
  const hash = [...id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0)
  return `/images/producer-farm-${hash % 3 + 1}.jpg`
}
