import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FormField } from '../components/FormField'
import { Icon } from '../components/Icon'
import { registerUser } from '../services/registration'
import { accessFields, contactFields, formatDocument, formatPhone, validateRegistration } from '../utils/registration'
import type { FieldName, RegistrationData } from '../utils/registration'
import './RegisterPage.css'

const initialData: RegistrationData = { name: '', document: '', email: '', password: '', confirmPassword: '', terms: false, phone: '', location: '' }

export function RegisterPage() {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<'BUYER' | 'PRODUCER'>('BUYER')
  const [data, setData] = useState(initialData)
  const [touched, setTouched] = useState<Partial<Record<keyof RegistrationData, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const errors = validateRegistration(data)

  function changeField(field: FieldName, value: string) {
    setData(current => ({ ...current, [field]: value }))
    setSubmitError('')
  }

  function fieldProps(field: FieldName) {
    return {
      id: field, name: field, value: data[field],
      error: touched[field] ? errors[field] : undefined,
      valid: Boolean(touched[field] && data[field] && !errors[field]),
      onBlur: () => setTouched(current => ({ ...current, [field]: true })),
      onChange: (value: string) => changeField(field, value),
    }
  }

  function moveToStep(nextStep: number) {
    setStep(nextStep)
    setSubmitError('')
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const fields = step === 1 ? accessFields : [...accessFields, ...contactFields]
    setTouched(current => ({ ...current, ...Object.fromEntries(fields.map(field => [field, true])) }))
    const firstError = fields.find(field => errors[field])
    if (firstError) {
      if (step === 2 && accessFields.includes(firstError)) setStep(1)
      requestAnimationFrame(() => document.getElementById(firstError)?.focus())
      return
    }
    if (step === 1) { moveToStep(2); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      await registerUser(data, profile)
      setSuccess(true)
      setData(initialData)
      requestAnimationFrame(() => headingRef.current?.focus())
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível criar sua conta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main id="main-content" className="registration-main">
      <div className="container registration-layout">
        <aside className="registration-intro" aria-label="Etapas do cadastro">
          <p className="eyebrow">CRIAR CONTA · ETAPA {step} DE 2</p>
          <h1>{step === 1 ? <>Comece <br />escolhendo seu <br />perfil</> : <>Vamos <br />completar seu <br />cadastro</>}</h1>
          <p className="intro-description">{step === 1 ? 'Uma conta para comprar camarão ou publicar suas próprias ofertas. Você poderá alterar seus dados depois.' : 'Adicione seus dados de contato para facilitar a conversa com compradores e produtores. Você poderá alterá-los depois.'}</p>
          <ol className="registration-steps">
            <li aria-current={step === 1 ? 'step' : undefined} className={step >= 1 ? 'is-active' : ''}>
              <span className="step-number">{step === 2 ? <Icon name="check" /> : '1'}</span>
              <div><strong>Perfil e acesso</strong><span>Escolha como vai usar a plataforma</span></div>
            </li>
            <li aria-current={step === 2 ? 'step' : undefined} className={step === 2 ? 'is-active' : ''}>
              <span className="step-number">2</span>
              <div><strong>Dados de contato</strong><span>Informações para negociar com segurança</span></div>
            </li>
          </ol>
          <div className="validation-note"><Icon name="info" /><p>Validações aparecem após sair do campo ou ao continuar.</p></div>
        </aside>

        <section className="registration-card" aria-label="Formulário de cadastro">
          {success ? (
            <div className="registration-success" role="status">
              <Icon name="check" />
              <h2 ref={headingRef} tabIndex={-1}>Conta criada com sucesso!</h2>
              <p>Seu cadastro foi concluído. Agora você pode entrar com seu e-mail e senha.</p>
              <a className="button button-primary" href="/entrar">Entrar</a>
            </div>
          ) : (
            <form onSubmit={submit} noValidate aria-busy={submitting}>
              {step === 1 ? <>
                <h2 ref={headingRef} tabIndex={-1} id="profile-title">Como você deseja usar a plataforma?</h2>
                <fieldset className="profile-options" aria-labelledby="profile-title">
                  {([
                    { value: 'BUYER', name: 'Comprador', description: 'Encontrar ofertas e conversar com produtores', icon: 'bag' },
                    { value: 'PRODUCER', name: 'Produtor', description: 'Publicar e administrar ofertas de camarão', icon: 'store' },
                  ] as const).map(option => (
                    <label key={option.value} className={`profile-option ${profile === option.value ? 'is-selected' : ''}`}>
                      <input type="radio" name="profile" value={option.value} checked={profile === option.value} onChange={() => setProfile(option.value)} />
                      <span className="profile-icon"><Icon name={option.icon} /></span>
                      <span className="profile-copy"><strong>{option.name}</strong><span>{option.description}</span></span>
                      <span className="radio-indicator" aria-hidden="true" />
                    </label>
                  ))}
                </fieldset>
                <div className="access-section">
                  <h2>Dados de acesso</h2>
                  <div className="fields-grid">
                    <FormField {...fieldProps('name')} label="Nome completo" placeholder="Seu nome completo" autoComplete="name" maxLength={255} required />
                    <FormField {...fieldProps('document')} onChange={value => changeField('document', formatDocument(value))} label="CPF ou CNPJ" placeholder="000.000.000-00" inputMode="numeric" maxLength={18} required />
                    <FormField {...fieldProps('email')} label="E-mail" placeholder="seuemail@exemplo.com.br" type="email" autoComplete="email" maxLength={320} autoCapitalize="none" spellCheck={false} wide required />
                    <FormField {...fieldProps('password')} label="Senha" placeholder="Mínimo de 8 caracteres" type="password" autoComplete="new-password" maxLength={72} hint="Use letras, números e um símbolo." required />
                    <FormField {...fieldProps('confirmPassword')} label="Confirmar senha" placeholder="Repita a senha" type="password" autoComplete="new-password" maxLength={72} required />
                  </div>
                </div>
                <div className="terms-field">
                  <div className="terms-line">
                    <input id="terms" type="checkbox" checked={data.terms} required aria-invalid={Boolean(touched.terms && errors.terms)} aria-describedby={touched.terms && errors.terms ? 'terms-error' : undefined} onChange={event => { setData(current => ({ ...current, terms: event.target.checked })); setTouched(current => ({ ...current, terms: true })) }} />
                    <label htmlFor="terms">Li e concordo com os <a href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>. A plataforma não processa pagamentos.</label>
                  </div>
                  {touched.terms && errors.terms && <p className="field-error" id="terms-error">{errors.terms}</p>}
                </div>
              </> : <>
                <h2 ref={headingRef} tabIndex={-1}>Dados de contato</h2>
                <p className="contact-description">Como podemos encontrar você? Os campos desta etapa são opcionais.</p>
                <div className="fields-grid contact-fields">
                  <FormField {...fieldProps('phone')} onChange={value => changeField('phone', formatPhone(value))} label="Telefone" type="tel" autoComplete="tel-national" placeholder="(00) 00000-0000" maxLength={15} wide />
                  <FormField {...fieldProps('location')} label="Cidade e estado" placeholder="Ex.: Aracati, CE" autoComplete="address-level2" maxLength={255} wide />
                </div>
                <div className="contact-note"><Icon name="info" /><p>A plataforma aproxima compradores e produtores. Negociação e pagamento acontecem fora da plataforma.</p></div>
              </>}
              {submitError && <div className="submit-error" role="alert"><Icon name="info" /><p>{submitError}</p></div>}
              <div className="form-actions">
                {step === 1 ? <a className="existing-account" href="/entrar">Já tem conta? <span>Entrar</span></a> : <button className="button button-secondary" type="button" disabled={submitting} onClick={() => moveToStep(1)}>Voltar</button>}
                <button className="button button-primary continue-button" type="submit" disabled={submitting}><Icon name="arrow" />{step === 1 ? 'Continuar' : submitting ? 'Criando conta...' : 'Criar conta'}</button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
