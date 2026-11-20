import { brazilianStates } from '../utils/registration.ts'
import type { SizeFilter } from './products.ts'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function getOfferState(location: string) {
  const code = location.trim().match(/(?:^|[\s,/–-])([a-z]{2})$/i)?.[1].toUpperCase()
  if (code && brazilianStates.some(state => state.code === code)) return code
  const normalized = normalize(location)
  return brazilianStates.find(state => normalized === normalize(state.name)
    || new RegExp(`[,/–-]\\s*${normalize(state.name)}$`).test(normalized))?.code ?? null
}

export function getOfferSize(size: string): SizeFilter | null {
  const value = normalize(size)
  if (value.includes('extra') || value.includes('jumbo') || value === 'gg') return 'extra-large'
  if (/\b(pequen[oa]|small)\b/.test(value) || value === 'p') return 'small'
  if (/\b(medi[oa]|medium)\b/.test(value) || value === 'm') return 'medium'
  if (/\b(grande|large)\b/.test(value) || value === 'g') return 'large'
  return null
}
