export type WeightUnit = 'kg' | 'g'
export type MeasuredField = 'price' | 'weight' | 'minimumQuantity' | 'maximumQuantity'
export type UnitField = `${MeasuredField}Unit`

export const unitOptions = [{ value: 'kg', label: 'Quilogramas (kg)' }, { value: 'g', label: 'Gramas (g)' }] as const

export function parseMeasuredValue(text: string, decimals: number): number {
  const cleaned = text.replace(/^\s*R\$\s*/i, '').trim()
  const grouped = new RegExp(`^\\d{1,3}(?:\\.\\d{3})+,\\d{1,${Math.max(1, decimals)}}$`)
  const value = grouped.test(cleaned) ? cleaned.replace(/\./g, '') : cleaned
  if (!new RegExp(`^\\d+(?:[.,]\\d{1,${Math.max(1, decimals)}})?$`).test(value)) return NaN
  const number = Number(value.replace(',', '.'))
  return decimals === 0 && !Number.isInteger(number) ? NaN : number
}

export function measuredDecimals(field: MeasuredField, unit: WeightUnit) {
  return field === 'price' ? unit === 'g' ? 5 : 2 : unit === 'g' ? 0 : 3
}

export function toCanonical(value: number, field: MeasuredField, unit: WeightUnit) {
  const converted = unit === 'kg' ? value : field === 'price' ? value * 1000 : value / 1000
  return Number(converted.toFixed(field === 'price' ? 2 : 3))
}

export function formatQuantity(kilograms: number) {
  if (kilograms > 0 && kilograms < 1) return `${Math.round(kilograms * 1000).toLocaleString('pt-BR')} g`
  return `${kilograms.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`
}
