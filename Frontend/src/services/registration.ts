import { digitsOnly, formatLocation } from '../utils/registration'
import type { RegistrationData } from '../utils/registration'

export async function registerUser(data: RegistrationData, userType: 'BUYER' | 'PRODUCER') {
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
  if (!baseUrl) throw new Error('O cadastro está temporariamente indisponível. Tente novamente mais tarde.')
  let response: Response
  try {
    response = await fetch(`${baseUrl}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        name: data.name.trim(), email: data.email.trim().toLowerCase(), password: data.password,
        userType, cpf_cnpj: digitsOnly(data.document),
        ...(data.phone && { phone: digitsOnly(data.phone) }),
        ...(formatLocation(data.city, data.state) && { location: formatLocation(data.city, data.state) }),
      }),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.')
  }
  if (response.status === 201) return
  if (response.status === 409) throw new Error('Já existe uma conta com este e-mail ou documento. Confira os dados informados.')
  if (response.status === 429) throw new Error('Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.')
  if (response.status === 400) throw new Error('Confira os dados do cadastro e tente novamente.')
  throw new Error('Não foi possível criar sua conta agora. Tente novamente mais tarde.')
}
