import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FormField } from '../components/FormField'
import { Icon } from '../components/Icon'
import { loginUser, logoutUser } from '../services/auth'
import type { UserSession } from '../services/auth'
import { validateLogin } from '../utils/login'
import type { LoginData } from '../utils/login'
import './LoginPage.css'

type Props = {
  session: UserSession | null
  restoring: boolean
  onSessionChange: (session: UserSession | null) => void
}

export function LoginPage({ session, restoring, onSessionChange }: Props) {
  const [data, setData] = useState<LoginData>({ email: '', password: '' })
  const [touched, setTouched] = useState<Partial<Record<keyof LoginData, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const pending = useRef(false)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const errors = validateLogin(data)

  function fieldProps(field: keyof LoginData) {
    return {
      id: `login-${field}`, name: field, value: data[field], disabled: submitting || restoring,
      error: touched[field] ? errors[field] : undefined,
      onBlur: () => setTouched(current => ({ ...current, [field]: true })),
      onChange: (value: string) => {
        setData(current => ({ ...current, [field]: value }))
        setSubmitError('')
      },
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || restoring) return
    setTouched({ email: true, password: true })
    const firstError = (['email', 'password'] as const).find(field => errors[field])
    if (firstError) { document.getElementById(`login-${firstError}`)?.focus(); return }
    pending.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      const nextSession = await loginUser(data)
      setData({ email: '', password: '' })
      setTouched({})
      onSessionChange(nextSession)
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.')
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  async function logout() {
    if (pending.current) return
    pending.current = true
    setSubmitting(true)
    setSubmitError('')
    try {
      await logoutUser()
      onSessionChange(null)
      requestAnimationFrame(() => document.getElementById('login-email')?.focus())
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível sair. Tente novamente.')
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="login-main">
      <div className="container login-layout">
        <div className="login-intro">
          <p className="login-eyebrow">CONECTANDO QUEM PRODUZ A QUEM COMPRA</p>
          <h1>Bom ter você<br /> de volta.</h1>
          <p className="login-description">Entre na sua conta e continue fazendo parte da rede que aproxima compradores e produtores de camarão.</p>
          <ul className="login-benefits">
            <li><span className="login-benefit-icon"><Icon name="bag" /></span><div><strong>Encontre novas oportunidades</strong><p>Acesse ofertas e conecte-se com produtores.</p></div></li>
            <li><span className="login-benefit-icon"><Icon name="farm" /></span><div><strong>Seu negócio mais perto de quem compra</strong><p>Gerencie suas ofertas e amplie suas conexões.</p></div></li>
          </ul>
          <p className="login-note"><Icon name="info" /><span>A negociação e o pagamento acontecem diretamente entre comprador e produtor.</span></p>
        </div>

        <section className="login-card" aria-labelledby="login-title" aria-busy={submitting || restoring}>
          {session ? (
            <div className="login-success">
              <span className="login-success-icon"><Icon name="check" /></span>
              <h2 id="login-title" ref={resultRef} tabIndex={-1}>Você está conectado!</h2>
              <p>Seu acesso à RedeCamarão como {session.userType === 'PRODUCER' ? 'produtor' : 'comprador'} foi confirmado.</p>
              <button className="button button-secondary" type="button" disabled={submitting} onClick={logout}>{submitting ? 'Saindo...' : 'Sair da conta'}</button>
            </div>
          ) : (
            <>
              <p className="login-eyebrow">SUA CONTA REDECAMARÃO</p>
              <h2 id="login-title">Entrar</h2>
              <p className="login-card-description">Use seu e-mail e senha para acessar sua conta.</p>
              <form onSubmit={submit} noValidate>
                <div className="login-fields">
                  <FormField {...fieldProps('email')} label="E-mail" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="seuemail@exemplo.com.br" maxLength={320} required />
                  <FormField {...fieldProps('password')} label="Senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" required />
                </div>
                <button className="button button-primary login-submit" type="submit" disabled={submitting || restoring}>
                  {restoring ? 'Verificando sessão...' : submitting ? 'Entrando...' : 'Entrar'}<Icon name="arrow" />
                </button>
                <p className="login-register">Ainda não tem uma conta? <a href="/registro">Criar conta</a></p>
              </form>
            </>
          )}
          {submitError && <div className="login-error" role="alert"><Icon name="info" /><p>{submitError}</p></div>}
          <p className="login-session-note" role="status">{restoring ? 'Aguarde enquanto verificamos seu acesso.' : 'Uma conta para comprar ou vender camarão.'}</p>
        </section>
      </div>
    </main>
  )
}
