import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { ProductCard } from '../components/ProductCard'
import { formatPrice } from '../data/marketplace'
import type { OfferDetail } from '../data/marketplace'
import { readSavedOffers, savedOffersKey, setOfferSaved } from '../data/offerDetail'
import { producerHref } from '../data/producers'
import { editOfferHref, myOffersHref, newOfferHref } from '../data/offerEditor'
import { isPublishedOffer } from '../data/account'
import { logoutUser, restoreSession } from '../services/auth'
import type { UserSession } from '../services/auth'
import { fetchOfferDetail } from '../services/offers'
import {
  fetchMyOffers, fetchMyProfile, updateMyProfile,
} from '../services/account'
import type { ManagedOffer, ProfileUpdate, UserProfile } from '../services/account'
import './AccountPage.css'

const readBrowserSavedOffers = () => {
  try { return readSavedOffers(window.localStorage) } catch { return [] }
}

function AccountPage({ session, restoring = false, onSessionChange, onProfileLoad }: {
  session: UserSession | null
  restoring?: boolean
  onSessionChange: (session: UserSession | null) => void
  onProfileLoad?: (name: string) => void
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [offers, setOffers] = useState<ManagedOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savedOfferIds, setSavedOfferIds] = useState(readBrowserSavedOffers)
  const [savedOffers, setSavedOffers] = useState<OfferDetail[]>([])
  const [savedLoadError, setSavedLoadError] = useState('')
  const [savedLoadedKey, setSavedLoadedKey] = useState('')
  const [savedAttempt, setSavedAttempt] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [profileEditing, setProfileEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<ProfileUpdate>({
    name: '', email: '', description: '', location: '', phone: '', businessHours: '',
  })
  const [loggingOut, setLoggingOut] = useState(false)
  const profileNameRef = useRef<HTMLInputElement>(null)
  const pending = useRef(false)
  const savedIdsKey = savedOfferIds.join('\u0000')
  const savedRequestKey = `${savedAttempt}:${savedIdsKey}`

  const withSession = useCallback(async <T,>(action: (token: string) => Promise<T>): Promise<T> => {
    if (!session) throw new Error('Entre novamente para continuar.')
    try { return await action(session.accessToken) }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes('sessão expirou')) throw error
      const renewed = await restoreSession()
      if (!renewed || renewed.userId !== session.userId || renewed.userType !== session.userType) {
        onSessionChange(null)
        throw new Error('Sua sessão expirou. Entre novamente para continuar.', { cause: error })
      }
      onSessionChange(renewed)
      return action(renewed.accessToken)
    }
  }, [session, onSessionChange])

  const reload = useCallback(async () => {
    if (!session) { setLoading(false); return }
    setLoading(true)
    setLoadError('')
    try {
      const currentProfile = await withSession(fetchMyProfile)
      setProfile(currentProfile)
      setProfileDraft({
        name: currentProfile.name, email: currentProfile.email,
        description: currentProfile.description ?? '', location: currentProfile.location ?? '',
        phone: currentProfile.phone ?? '', businessHours: currentProfile.businessHours ?? '',
      })
      if (currentProfile.userType === 'PRODUCER') setOffers(await withSession(token => fetchMyOffers(token, session.userId)))
      else setOffers([])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar sua conta.')
    } finally { setLoading(false) }
  }, [session, withSession])

  useEffect(() => { void Promise.resolve().then(reload) }, [reload])
  useEffect(() => {
    const syncSavedOffers = (event: StorageEvent) => {
      if (event.key === savedOffersKey || event.key === null) setSavedOfferIds(readBrowserSavedOffers())
    }
    window.addEventListener('storage', syncSavedOffers)
    return () => window.removeEventListener('storage', syncSavedOffers)
  }, [])
  useEffect(() => {
    if (profile?.userType !== 'BUYER') return
    let active = true
    Promise.resolve().then(async () => {
      const details = await Promise.all(savedOfferIds.map(id => fetchOfferDetail(id)))
      if (!active) return
      const unavailableIds = savedOfferIds.filter((_id, index) => details[index] === null)
      if (unavailableIds.length) {
        unavailableIds.forEach(id => setOfferSaved(window.localStorage, id, false))
        setSavedOfferIds(readBrowserSavedOffers())
      }
      setSavedOffers(details.filter((offer): offer is OfferDetail => offer !== null))
      setSavedLoadError('')
    }).catch(error => {
      if (active) {
        setSavedOffers([])
        setSavedLoadError(error instanceof Error ? error.message : 'Não foi possível carregar as ofertas salvas.')
      }
    }).finally(() => { if (active) setSavedLoadedKey(savedRequestKey) })
    return () => { active = false }
  }, [profile?.userType, savedOfferIds, savedRequestKey])
  useEffect(() => {
    document.title = `${profile?.name ?? 'Minha conta'} | RedeCamarão`
    if (profile) onProfileLoad?.(profile.name)
  }, [profile, onProfileLoad])

  const activeCount = offers.filter(offer => isPublishedOffer(offer)).length
  const pausedCount = offers.filter(offer => offer.status === 'INACTIVE').length
  const completedCount = offers.filter(offer => ['EXPIRED', 'SOLD_OUT', 'CANCELLED'].includes(offer.status)).length
  const savedOffersLoading = profile?.userType === 'BUYER' && savedLoadedKey !== savedRequestKey

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || pending.current) return
    pending.current = true
    setSavingProfile(true)
    setFeedback('')
    try {
      await withSession(token => updateMyProfile(token, {
        ...profileDraft,
        name: profileDraft.name.trim(), email: profileDraft.email.trim(),
        description: profileDraft.description?.trim() || null,
        location: profileDraft.location?.trim() || null,
        phone: profileDraft.phone?.trim() || null,
        businessHours: profileDraft.businessHours?.trim() || null,
      }))
      setProfile(current => current ? { ...current, ...profileDraft } : current)
      setProfileEditing(false)
      setFeedback('Dados do perfil atualizados.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.')
    } finally { pending.current = false; setSavingProfile(false) }
  }

  async function logout() {
    if (pending.current) return
    pending.current = true
    setLoggingOut(true)
    setFeedback('')
    try { await logoutUser(); onSessionChange(null) }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'Não foi possível sair da conta.') }
    finally { pending.current = false; setLoggingOut(false) }
  }

  function removeSavedOffer(id: string) {
    try {
      setOfferSaved(window.localStorage, id, false)
      setSavedOfferIds(readBrowserSavedOffers())
      setSavedOffers(current => current.filter(offer => offer.id !== id))
      setFeedback('Oferta removida dos salvos.')
    } catch (error) {
      setFeedback(error instanceof Error ? 'Não foi possível atualizar a lista neste navegador.' : 'Não foi possível remover a oferta salva.')
    }
  }

  if (restoring) return <main id="main-content" className="account-main"><div className="container account-status" role="status"><Icon name="waves" /><h1>Carregando sua conta...</h1></div></main>

  if (!session) return (
    <main id="main-content" className="account-main"><div className="container account-status">
      <Icon name="info" /><h1>Entre para acessar sua conta</h1>
      <p>Faça login para consultar seus dados e gerenciar suas ofertas.</p>
      <a className="button button-primary" href="/entrar">Entrar na RedeCamarão</a>
    </div></main>
  )

  if (loading || loadError || !profile) return (
    <main id="main-content" className="account-main"><div className="container account-status" role={loadError ? 'alert' : 'status'}>
      <Icon name={loading ? 'waves' : 'info'} />
      <h1>{loading ? 'Carregando sua conta...' : 'Não foi possível carregar sua conta'}</h1>
      <p>{loading ? 'Estamos buscando seus dados e ofertas.' : loadError}</p>
      {!loading && <button className="button button-secondary" type="button" onClick={() => void reload()}>Tentar novamente</button>}
      {loadError.includes('sessão expirou') && <a className="button button-primary" href="/entrar">Entrar novamente</a>}
    </div></main>
  )

  return (
    <main id="main-content" className={`account-main${profile.userType === 'PRODUCER' ? ' producer-account' : ''}`}>
      <div className="container account-container">
        <section className="account-welcome">
          <div><p className="account-eyebrow">{profile.userType === 'PRODUCER' ? 'PAINEL DO PRODUTOR' : 'PERFIL DO COMPRADOR'}</p>
            <h1>Olá, {profile.name}!</h1>
            <p>{profile.userType === 'PRODUCER' ? 'Acompanhe e atualize suas ofertas publicadas.' : 'Encontre ofertas salvas e mantenha seus dados atualizados para comprar com mais facilidade.'}</p></div>
          {profile.userType === 'PRODUCER' ? <a className="button button-primary account-create" href={newOfferHref}><span aria-hidden="true">+</span>Cadastrar nova oferta</a> : <button type="button" className="button button-secondary account-logout" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'Saindo...' : 'Sair da conta'}
          </button>}
        </section>

        {profile.userType === 'PRODUCER' && <>
          <section className="account-metrics" aria-label="Resumo das ofertas">
            <article><div><span>Ofertas ativas</span><span className="account-metric-icon"><Icon name="box" /></span></div><strong>{activeCount}</strong><small>Disponíveis no marketplace</small></article>
            <article><div><span>Ofertas pausadas</span><span className="account-metric-icon"><Icon name="pause" /></span></div><strong>{pausedCount}</strong><small>Fora do marketplace</small></article>
            <article><div><span>Ofertas encerradas</span><span className="account-metric-icon"><Icon name="check" /></span></div><strong>{completedCount}</strong><small>Vendidas, expiradas ou canceladas</small></article>
            <article><div><span>Total de ofertas</span><span className="account-metric-icon"><Icon name="grid" /></span></div><strong>{offers.length}</strong><small>Todas as suas publicações</small></article>
          </section>

          <section id="ofertas" className="account-offers" aria-labelledby="recent-offers-title">
            <div className="account-section-heading"><div><h2 id="recent-offers-title">Ofertas recentes</h2><p>Veja seus últimos anúncios e continue o gerenciamento.</p></div><a className="button button-secondary" href={myOffersHref}>Gerenciar minhas ofertas<Icon name="arrow" /></a></div>
            {offers.length ? <div className="account-recent-grid">{offers.slice(0, 3).map(offer => <article key={offer.id}><span className="account-eyebrow">{offer.type || 'Camarão'}</span><h3>{offer.title}</h3><p>{formatPrice(offer.price)} / kg · {offer.weight.toLocaleString('pt-BR')} kg</p><a className="button button-secondary" href={editOfferHref(offer.id)}>Editar oferta<Icon name="edit" /></a></article>)}</div> : <div className="account-empty"><Icon name="box" /><h3>Você ainda não cadastrou ofertas</h3><p>Adicione fotos e informações do seu lote para começar.</p><a className="button button-primary" href={newOfferHref}>Cadastrar primeira oferta</a></div>}
          </section>
        </>}

        {profile.userType === 'BUYER' && <section id="salvas" className="buyer-saved" aria-labelledby="buyer-saved-title">
          <div className="account-section-heading">
            <div><p className="account-eyebrow">SUAS ESCOLHAS</p><h2 id="buyer-saved-title">Ofertas salvas</h2>
              <p>{savedOfferIds.length} {savedOfferIds.length === 1 ? 'oferta salva neste navegador' : 'ofertas salvas neste navegador'}</p></div>
            <a className="button button-primary" href="/produtos">Explorar ofertas</a>
          </div>
          {savedOffersLoading ? <p className="buyer-saved-state" role="status">Carregando suas ofertas salvas...</p>
            : savedLoadError ? <div className="buyer-saved-state" role="alert"><p>{savedLoadError}</p><button className="button button-secondary" type="button" onClick={() => setSavedAttempt(value => value + 1)}>Tentar novamente</button></div>
              : savedOffers.length ? <div className="buyer-saved-grid">{savedOffers.map(offer => <article className="buyer-saved-item" key={offer.id}>
                <ProductCard offer={offer} />
                <button type="button" className="buyer-remove-saved" onClick={() => removeSavedOffer(offer.id)}><Icon name="bookmark" />Remover dos salvos</button>
              </article>)}</div>
                : <div className="buyer-saved-empty"><span className="buyer-empty-icon"><Icon name="bookmark" /></span>
                  <h3>{savedOfferIds.length ? 'Nenhuma oferta salva está disponível' : 'Ainda não há ofertas salvas'}</h3>
                  <p>{savedOfferIds.length ? 'As ofertas salvas podem ter sido encerradas. Explore o marketplace para encontrar outras opções.' : 'Salve ofertas interessantes para encontrá-las rapidamente quando voltar.'}</p>
                  <a className="button button-secondary" href="/produtos">Ver ofertas disponíveis</a>
                </div>}
        </section>}

        <section id="perfil" className="account-profile" aria-labelledby="account-profile-title">
          <div className="account-section-heading"><div><h2 id="account-profile-title">{profile.userType === 'BUYER' ? 'Dados pessoais' : 'Dados do perfil'}</h2><p>{profile.userType === 'BUYER' ? 'Mantenha seus dados de contato atualizados.' : 'Essas informações ajudam a identificar sua conta na rede.'}</p></div>
            <div className="account-section-actions">{profile.userType === 'PRODUCER' && <a className="button button-secondary" href={producerHref(session.userId)}>Ver perfil público</a>}
            {!profileEditing && <button type="button" className="button button-secondary" onClick={() => { setProfileEditing(true); requestAnimationFrame(() => profileNameRef.current?.focus()) }}><Icon name="edit" />Editar perfil</button>}</div>
          </div>
          {profileEditing ? <form className="account-profile-form" onSubmit={submitProfile}>
            <label>Nome<input ref={profileNameRef} required maxLength={255} value={profileDraft.name} onChange={event => setProfileDraft(current => ({ ...current, name: event.target.value }))} /></label>
            <label>E-mail<input type="email" required maxLength={320} value={profileDraft.email} onChange={event => setProfileDraft(current => ({ ...current, email: event.target.value }))} /></label>
            <label>Telefone<input type="tel" maxLength={20} value={profileDraft.phone ?? ''} onChange={event => setProfileDraft(current => ({ ...current, phone: event.target.value }))} /></label>
            <label>Localização<input maxLength={255} value={profileDraft.location ?? ''} onChange={event => setProfileDraft(current => ({ ...current, location: event.target.value }))} /></label>
            {profile.userType === 'PRODUCER' && <>
              <label className="profile-field-wide">Apresentação<textarea maxLength={2000} rows={3} value={profileDraft.description ?? ''} onChange={event => setProfileDraft(current => ({ ...current, description: event.target.value }))} /></label>
              <label className="profile-field-wide">Horário de atendimento<input maxLength={255} value={profileDraft.businessHours ?? ''} onChange={event => setProfileDraft(current => ({ ...current, businessHours: event.target.value }))} /></label>
            </>}
            <div className="account-form-actions profile-field-wide"><button className="button button-secondary" type="button" onClick={() => setProfileEditing(false)} disabled={savingProfile}>Cancelar</button>
              <button className="button button-primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Salvando...' : 'Salvar perfil'}</button></div>
          </form> : <dl className="account-profile-details">
            <div><dt>Nome</dt><dd>{profile.name}</dd></div><div><dt>E-mail</dt><dd>{profile.email}</dd></div>
            <div><dt>Telefone</dt><dd>{profile.phone || 'Não informado'}</dd></div><div><dt>Localização</dt><dd>{profile.location || 'Não informada'}</dd></div>
            {profile.userType === 'PRODUCER' && <><div className="profile-detail-wide"><dt>Apresentação</dt><dd>{profile.description || 'Adicione uma apresentação sobre sua fazenda.'}</dd></div>
              <div className="profile-detail-wide"><dt>Horário de atendimento</dt><dd>{profile.businessHours || 'Não informado'}</dd></div></>}
          </dl>}
          {profile.userType === 'PRODUCER' && <button type="button" className="account-signout" onClick={logout} disabled={loggingOut}>{loggingOut ? 'Saindo...' : 'Sair da conta'}</button>}
        </section>
      </div>
      {feedback && <div className="account-toast" role="status">{feedback}<button type="button" aria-label="Fechar aviso" onClick={() => setFeedback('')}><Icon name="close" /></button></div>}
    </main>
  )
}

export { AccountPage }
