export type RegistrationData = {
  name: string
  document: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
  phone: string
  city: string
  state: string
}
export type FieldName = Exclude<keyof RegistrationData, 'terms'>
export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>
export const accessFields: (keyof RegistrationData)[] = ['name', 'document', 'email', 'password', 'confirmPassword', 'terms']
export const contactFields: (keyof RegistrationData)[] = ['phone', 'city', 'state']
export const brazilianStates = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
] as const
export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export function formatLocation(city: string, state: string) {
  return city.trim() && state ? `${city.trim()}, ${state}` : ''
}

export function formatDocument(value: string) {
  const digits = digitsOnly(value).slice(0, 14)
  return digits.length <= 11
    ? digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
    : digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

export function formatPhone(value: string) {
  const digits = digitsOnly(value).slice(0, 11)
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4,5})(\d{4})$/, '$1-$2')
}

export function isValidDocument(value: string) {
  const digits = digitsOnly(value)
  if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) return false
  const calculate = (base: string, weights: number[]) => {
    const remainder = [...base].reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const base = digits.slice(0, -2)
  const weights = digits.length === 11 ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const first = calculate(base, weights)
  const second = calculate(base + first, digits.length === 11 ? [11, ...weights] : [6, ...weights])
  return digits.endsWith(`${first}${second}`)
}

export function validateRegistration(data: RegistrationData): RegistrationErrors {
  const errors: RegistrationErrors = {}
  if (data.name.trim().split(/\s+/).length < 2 || data.name.trim().length < 3) errors.name = 'Informe seu nome completo.'
  if (!isValidDocument(data.document)) errors.document = 'Documento inválido. Confira os números.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (data.password.length < 8) errors.password = 'A senha deve ter pelo menos 8 caracteres.'
  else if (data.password.length > 72) errors.password = 'A senha deve ter no máximo 72 caracteres.'
  if (!data.confirmPassword) errors.confirmPassword = 'Repita a senha.'
  else if (data.confirmPassword !== data.password) errors.confirmPassword = 'As senhas não coincidem.'
  if (!data.terms) errors.terms = 'Aceite os Termos de Uso e a Política de Privacidade para continuar.'
  for (const field of ['phone'] as const) {
    if (data[field] && !/^[1-9]{2}\d{8,9}$/.test(digitsOnly(data[field]))) errors[field] = 'Informe um telefone válido com DDD.'
  }
  if (data.city.trim() && !data.state) errors.state = 'Selecione o estado da cidade.'
  if (data.state && !data.city.trim()) errors.city = 'Informe a cidade.'
  return errors
}
