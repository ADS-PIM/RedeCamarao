import assert from 'node:assert/strict'
import test from 'node:test'
import { validateLogin } from '../src/utils/login.ts'
import { loginUser, logoutUser, restoreSession } from '../src/services/auth.ts'

const api = 'https://api.example.test/'
const credentials = { email: ' MARINA@EXAMPLE.COM ', password: ' senha ' }
const session = { accessToken: 'test-access-token', userId: 'user-1', userType: 'BUYER' }

test('login exige e-mail válido e senha sem impor regras de criação de senha', () => {
  assert.deepEqual(validateLogin({ email: '', password: '' }), { email: 'Informe seu e-mail.', password: 'Informe sua senha.' })
  assert.ok(validateLogin({ email: 'email-invalido', password: '123' }).email)
  assert.deepEqual(validateLogin(credentials), {})
  assert.deepEqual(validateLogin({ email: 'marina@example.com', password: '123' }), {})
})

test('login envia credenciais com cookies, normaliza e-mail e preserva a senha', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, `${api}users/login`)
    assert.equal(options.method, 'POST')
    assert.equal(options.credentials, 'include')
    assert.deepEqual(JSON.parse(options.body as string), { email: 'marina@example.com', password: ' senha ' })
    return Response.json(session)
  })
  assert.deepEqual(await loginUser(credentials, api), session)
})

test('login traduz falhas HTTP sem expor mensagens internas do servidor', async t => {
  for (const [status, message] of [[401, /E-mail ou senha incorretos/], [429, /Muitas tentativas/], [400, /Confira o e-mail/], [500, /Não foi possível entrar agora/]] as const) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'internal details' }, { status }))
    await assert.rejects(loginUser(credentials, api), message)
    mock.mock.restore()
  }
})

test('login rejeita falha de rede e configuração ausente', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(loginUser(credentials, api), /Confira sua conexão/)
  await assert.rejects(loginUser(credentials, ''), /temporariamente indisponível/)
  assert.equal(mock.mock.callCount(), 1)
})

test('login não aceita sucesso com sessão incompleta ou resposta inválida', async t => {
  for (const data of [{}, { ...session, accessToken: '' }, { ...session, userType: 'ADMIN' }, { ...session, userId: null }]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(data))
    await assert.rejects(loginUser(credentials, api), /confirmar seu acesso/)
    mock.mock.restore()
  }
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>error</html>'))
  await assert.rejects(loginUser(credentials, api), /confirmar seu acesso/)
})

test('restauração compartilha requisições concorrentes e permite nova tentativa depois', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, `${api}users/refresh`)
    assert.equal(options.credentials, 'include')
    return Response.json(session)
  })
  const first = restoreSession(api)
  const second = restoreSession(api)
  assert.equal(first, second)
  assert.deepEqual(await first, session)
  assert.equal(mock.mock.callCount(), 1)
  await restoreSession(api)
  assert.equal(mock.mock.callCount(), 2)
})

test('restauração reconhece cookie expirado e ausência de configuração', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }))
  assert.equal(await restoreSession(api), null)
  assert.equal(await restoreSession(''), null)
  assert.equal(mock.mock.callCount(), 1)
})

test('logout envia o cookie e só confirma saída após resposta bem-sucedida', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, `${api}users/logout`)
    assert.equal(options.credentials, 'include')
    return Response.json({ message: 'Logged out successfully' })
  })
  await logoutUser(api)
  mock.mock.restore()
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 500 }))
  await assert.rejects(logoutUser(api), /Não foi possível sair/)
})
