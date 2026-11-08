export type RegistrationData = {
  name: string
  document: string
  email: string
  password: string
  confirmPassword: string
  terms: boolean
  phone: string
  location: string
}
export type FieldName = Exclude<keyof RegistrationData, 'terms'>
export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>
export const accessFields: (keyof RegistrationData)[] = ['name', 'document', 'email', 'password', 'confirmPassword', 'terms']
export const contactFields: (keyof RegistrationData)[] = ['phone', 'location']
export const digitsOnly = (value: string) => value.replace(/\D/g, '')

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
  return errors
}
