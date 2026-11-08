export type LoginData = { email: string; password: string }
export type LoginErrors = Partial<Record<keyof LoginData, string>>

export function validateLogin(data: LoginData): LoginErrors {
  const errors: LoginErrors = {}
  if (!data.email.trim()) errors.email = 'Informe seu e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Informe um e-mail válido.'
  if (!data.password) errors.password = 'Informe sua senha.'
  return errors
}
