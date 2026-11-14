import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Dialog } from '../components/Dialog'
import { ProductCard } from '../components/ProductCard'
import { formatDate, formatPrice } from '../data/marketplace'
import type { OfferDetail } from '../data/marketplace'
import { readSavedOffers, savedOffersKey, setOfferSaved } from '../data/offerDetail'
import { producerHref } from '../data/producers'
import { offerHref, offerIllustration } from '../data/offerDetail'
import { canActivateOffer, filterManagedOffers, isPublishedOffer, localDateString, offerStatusNames } from '../data/account'
import { logoutUser, restoreSession } from '../services/auth'
import type { UserSession } from '../services/auth'
import { fetchOfferDetail } from '../services/offers'
import {
  createOffer, deleteOffer, fetchMyOffers, fetchMyProfile, updateMyProfile, updateOffer,
} from '../services/account'
import type { ManagedOffer, NewOffer, OfferStatus, ProfileUpdate, UserProfile } from '../services/account'
import './AccountPage.css'

const statusFilters: { value: OfferStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'INACTIVE', label: 'Pausadas' },
  { value: 'EXPIRED', label: 'Expiradas' },
  { value: 'SOLD_OUT', label: 'Vendidas' },
  { value: 'CANCELLED', label: 'Canceladas' },
]
const dateField = (value: string) => value.slice(0, 10)
const readBrowserSavedOffers = () => {
  try { return readSavedOffers(window.localStorage) } catch { return [] }
}

type OfferForm = {
  title: string; type: string; size: string; price: string; weight: string
  location: string; startDate: string; endDate: string; description: string
  minimumQuantity: string; maximumQuantity: string
}
const emptyOffer: OfferForm = {
  title: '', type: 'Camarão', size: '', price: '', weight: '', location: '',
  startDate: localDateString(),
  endDate: localDateString(7),
  description: '', minimumQuantity: '1', maximumQuantity: '',
}

function initialOfferForm(offer: ManagedOffer): OfferForm {
  return {
    ...emptyOffer, title: offer.title, type: offer.type ?? '', size: offer.size,
    price: String(offer.price), weight: String(offer.weight), location: offer.location,
    startDate: dateField(offer.startDate), endDate: dateField(offer.endDate),
    description: offer.description, minimumQuantity: String(offer.minimumQuantity), maximumQuantity: String(offer.maximumQuantity),
  }
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [profileEditing, setProfileEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<ProfileUpdate>({
    name: '', email: '', description: '', location: '', phone: '', businessHours: '',
  })
  const [offerEditor, setOfferEditor] = useState<{ offer: ManagedOffer | null; values: OfferForm } | null>(null)
  const [savingOffer, setSavingOffer] = useState(false)
  const [busyOfferId, setBusyOfferId] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmation, setConfirmation] = useState<{ offer: ManagedOffer; action: 'pause' | 'activate' | 'delete' } | null>(null)
  const profileNameRef = useRef<HTMLInputElement>(null)
  const offerTitleRef = useRef<HTMLInputElement>(null)
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
    const closeMenus = (event: Event) => {
      document.querySelectorAll<HTMLDetailsElement>('.account-more[open]').forEach(menu => {
        if (event instanceof KeyboardEvent && event.key !== 'Escape') return
        if (event.type === 'pointerdown' && event.target instanceof Node && menu.contains(event.target)) return
        menu.open = false
        if (event instanceof KeyboardEvent) menu.querySelector<HTMLElement>('summary')?.focus()
      })
    }
    document.addEventListener('pointerdown', closeMenus)
    document.addEventListener('keydown', closeMenus)
    return () => { document.removeEventListener('pointerdown', closeMenus); document.removeEventListener('keydown', closeMenus) }
  }, [])
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

  const filteredOffers = useMemo(() => {
    return filterManagedOffers(offers, search, statusFilter)
  }, [offers, search, statusFilter])
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleOffers = filteredOffers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeCount = offers.filter(offer => isPublishedOffer(offer)).length
  const pausedCount = offers.filter(offer => offer.status === 'INACTIVE').length
  const completedCount = offers.filter(offer => ['EXPIRED', 'SOLD_OUT', 'CANCELLED'].includes(offer.status)).length
  const savedOffersLoading = profile?.userType === 'BUYER' && savedLoadedKey !== savedRequestKey

  function openCreateOffer() {
    setOfferEditor({ offer: null, values: { ...emptyOffer, startDate: localDateString(), endDate: localDateString(7), location: profile?.location ?? '' } })
    setFeedback('')
    requestAnimationFrame(() => offerTitleRef.current?.focus())
  }

  function openEditOffer(offer: ManagedOffer) {
    setOfferEditor({ offer, values: initialOfferForm(offer) })
    setFeedback('')
    requestAnimationFrame(() => offerTitleRef.current?.focus())
  }

  function duplicateOffer(offer: ManagedOffer) {
    setOfferEditor({ offer: null, values: { ...initialOfferForm(offer), title: `${offer.title} — cópia`.slice(0, 255), startDate: localDateString(), endDate: localDateString(7) } })
    setFeedback('')
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !offerEditor || pending.current) return
    const { offer, values } = offerEditor
    if (new Date(values.endDate) < new Date(values.startDate)) {
      setFeedback('A data final não pode ser anterior à data inicial.')
      return
    }
    if (Number(values.minimumQuantity) > Number(values.maximumQuantity)) {
      setFeedback('A quantidade mínima não pode exceder a quantidade máxima.')
      return
    }
    if (![values.title, values.type, values.size, values.location, values.description].every(value => value.trim())) {
      setFeedback('Preencha os campos de texto antes de salvar.')
      return
    }
    pending.current = true
    setSavingOffer(true)
    setFeedback('')
    try {
      if (offer) {
        await withSession(token => updateOffer(token, offer.id, {
          title: values.title.trim(), type: values.type.trim() || null, size: values.size.trim(),
          price: Number(values.price), weight: Number(values.weight), location: values.location.trim(),
          startDate: values.startDate, endDate: values.endDate,
          description: values.description.trim(), minimumQuantity: Number(values.minimumQuantity), maximumQuantity: Number(values.maximumQuantity),
        }))
        setFeedback('Oferta atualizada com sucesso.')
      } else {
        const data: NewOffer = {
          title: values.title.trim(), type: values.type.trim(), size: values.size.trim(),
          price: Number(values.price), weight: Number(values.weight),
          maximumQuantity: Number(values.maximumQuantity), minimumQuantity: Number(values.minimumQuantity),
          location: values.location.trim(), startDate: values.startDate, endDate: values.endDate,
          description: values.description.trim(),
        }
        await withSession(token => createOffer(token, data))
        setFeedback('Oferta cadastrada como pausada. Ative-a na lista para publicá-la.')
      }
      setOfferEditor(null)
      await reload()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível salvar a oferta.')
    } finally { pending.current = false; setSavingOffer(false) }
  }

  async function changeOfferStatus(offer: ManagedOffer) {
    if (!session || pending.current) return
    pending.current = true
    setBusyOfferId(offer.id)
    setFeedback('')
    try {
      const status = offer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await withSession(token => updateOffer(token, offer.id, { status }))
      setOffers(current => current.map(item => item.id === offer.id ? { ...item, status } : item))
      setConfirmation(null)
      setFeedback(status === 'ACTIVE' ? 'Oferta ativada. Ela aparecerá no marketplace durante o período informado.' : 'Oferta pausada e removida do marketplace.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível alterar o status da oferta.')
    } finally { pending.current = false; setBusyOfferId('') }
  }

  async function removeOffer(offer: ManagedOffer) {
    if (!session || pending.current) return
    pending.current = true
    setBusyOfferId(offer.id)
    setFeedback('')
    try {
      await withSession(token => deleteOffer(token, offer.id))
      setOffers(current => current.filter(item => item.id !== offer.id))
      setConfirmation(null)
      setFeedback('Oferta excluída.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível excluir a oferta.')
    } finally { pending.current = false; setBusyOfferId('') }
  }

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
          {profile.userType === 'PRODUCER' ? <button type="button" className="button button-primary account-create" onClick={openCreateOffer}><span aria-hidden="true">+</span>Cadastrar nova oferta</button> : <button type="button" className="button button-secondary account-logout" onClick={logout} disabled={loggingOut}>
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

          <section id="ofertas" className="account-offers" aria-labelledby="account-offers-title">
            <div className="account-section-heading">
              <div><h2 id="account-offers-title">Minhas ofertas</h2><p>{offers.length} {offers.length === 1 ? 'oferta no total' : 'ofertas no total'}</p></div>
              <div className="account-toolbar">
              <label className="account-search search-field"><Icon name="search" /><span className="visually-hidden">Buscar oferta</span>
                <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar oferta" /></label>
              <label className="account-filter"><span className="visually-hidden">Filtrar por status</span>
                <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as OfferStatus | 'ALL'); setPage(1) }}>
                  {statusFilters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select></label>
              </div>
            </div>
            <p className="visually-hidden" role="status">{filteredOffers.length} ofertas encontradas</p>
            {visibleOffers.length ? <div className="account-table-wrap"><table className="account-table">
              <caption className="visually-hidden">Suas ofertas e ações de gerenciamento</caption>
              <thead><tr><th scope="col">Oferta</th><th scope="col">Preço</th><th scope="col">Quantidade</th><th scope="col">Status</th><th scope="col">Publicação</th><th scope="col">Ações</th></tr></thead>
              <tbody>{visibleOffers.map(offer => <tr key={offer.id}>
                <td><div className="account-offer-name"><span className="account-offer-image"><img src={offerIllustration(offer)} alt="" width="64" height="56" loading="lazy" /><span>Ilustrativa</span></span>
                  <div><strong>{offer.title}</strong><small>#{offer.id.slice(0, 8)}</small></div></div></td>
                <td data-label="Preço"><strong>{formatPrice(offer.price)}</strong><small className="account-price-unit">/kg</small></td>
                <td data-label="Quantidade">{offer.weight.toLocaleString('pt-BR')} kg</td>
                <td data-label="Status"><span className={`offer-status status-${offer.status.toLowerCase()}`}>{offerStatusNames[offer.status]}</span></td>
                <td data-label="Publicação"><time dateTime={offer.createdAt}>{formatDate(offer.createdAt)}</time></td>
                <td><div className="account-row-actions">
                  <button type="button" aria-label={`Editar ${offer.title}`} onClick={() => openEditOffer(offer)}><Icon name="edit" />Editar</button>
                  {(offer.status === 'ACTIVE' || canActivateOffer(offer)) && <button type="button" aria-label={`${offer.status === 'ACTIVE' ? 'Pausar' : 'Ativar'} ${offer.title}`} disabled={Boolean(busyOfferId)} onClick={() => { setFeedback(''); setConfirmation({ offer, action: offer.status === 'ACTIVE' ? 'pause' : 'activate' }) }}>
                    <Icon name={offer.status === 'ACTIVE' ? 'pause' : 'play'} />{offer.status === 'ACTIVE' ? 'Pausar' : 'Ativar'}</button>}
                  <details className="account-more">
                    <summary aria-label={`Mais ações para ${offer.title}`}><Icon name="more" /></summary>
                    <div className="account-more-popover">
                      <button type="button" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); duplicateOffer(offer) }}><Icon name="grid" />Duplicar oferta</button>
                      {isPublishedOffer(offer) && <a href={offerHref(offer.id)}><Icon name="eye" />Visualizar página pública</a>}
                      <button type="button" className="account-delete" disabled={Boolean(busyOfferId)} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setFeedback(''); setConfirmation({ offer, action: 'delete' }) }}><Icon name="trash" />Remover oferta</button>
                    </div>
                  </details>
                </div></td>
              </tr>)}</tbody>
            </table></div> : <div className="account-empty"><Icon name="box" /><h3>{offers.length ? 'Nenhuma oferta encontrada' : 'Você ainda não cadastrou ofertas'}</h3>
              <p>{offers.length ? 'Ajuste a busca ou selecione outro status.' : 'Cadastre sua primeira oferta para apresentá-la aos compradores.'}</p>
              {!offers.length ? <button type="button" className="button button-primary" onClick={openCreateOffer}>Cadastrar primeira oferta</button> : <button type="button" className="button button-secondary" onClick={() => { setSearch(''); setStatusFilter('ALL'); setPage(1) }}>Limpar busca e filtros</button>}
            </div>}
            {filteredOffers.length > 0 && <div className="account-pagination">
              <span>Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredOffers.length)} de {filteredOffers.length} ofertas</span>
              <nav aria-label="Paginação de minhas ofertas"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</button></nav>
            </div>}
          </section>
          <p className="account-management-note"><Icon name="info" />Editar abre os dados da oferta; pausar retira a publicação do marketplace. Você pode ativá-la novamente enquanto estiver no prazo.</p>
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
      {offerEditor && <Dialog titleId="offer-editor-title" onClose={() => setOfferEditor(null)} busy={savingOffer}>
          <div className="account-modal-heading"><div><p className="account-eyebrow">{offerEditor.offer ? 'GERENCIAR OFERTA' : 'NOVA PUBLICAÇÃO'}</p>
            <h2 id="offer-editor-title">{offerEditor.offer ? 'Editar oferta' : 'Cadastrar oferta'}</h2></div>
            <button type="button" aria-label="Fechar" disabled={savingOffer} onClick={() => setOfferEditor(null)}>×</button></div>
          <form onSubmit={submitOffer} className="account-offer-form">
            <label className="offer-field-wide">Nome da oferta<input ref={offerTitleRef} autoFocus required maxLength={255} value={offerEditor.values.title} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, title: event.target.value } }))} /></label>
            <label>Tipo<input required maxLength={255} value={offerEditor.values.type} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, type: event.target.value } }))} /></label>
            <label>Tamanho<input required maxLength={255} value={offerEditor.values.size} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, size: event.target.value } }))} /></label>
            <label>Preço por kg (R$)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.price} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, price: event.target.value } }))} /></label>
            <label>Quantidade (kg)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.weight} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, weight: event.target.value } }))} /></label>
            <label>Localização<input required maxLength={255} value={offerEditor.values.location} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, location: event.target.value } }))} /></label>
            <label>Disponível a partir de<input required type="date" value={offerEditor.values.startDate} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, startDate: event.target.value } }))} /></label>
            <label>Disponível até<input required type="date" value={offerEditor.values.endDate} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, endDate: event.target.value } }))} /></label>
              <label>Quantidade mínima (kg)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.minimumQuantity} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, minimumQuantity: event.target.value } }))} /></label>
              <label>Quantidade máxima (kg)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.maximumQuantity} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, maximumQuantity: event.target.value } }))} /></label>
              <div className="offer-field-wide account-description-field"><label htmlFor="managed-offer-description">Descrição</label><textarea id="managed-offer-description" required maxLength={1000} rows={4} value={offerEditor.values.description} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, description: event.target.value } }))} /></div>
            {!offerEditor.offer && <p className="account-modal-note offer-field-wide"><Icon name="info" />A nova oferta fica pausada até você ativá-la na lista.</p>}
            {feedback && <p className="account-feedback offer-field-wide" role="alert">{feedback}</p>}
            <div className="account-form-actions offer-field-wide"><button className="button button-secondary" type="button" onClick={() => setOfferEditor(null)} disabled={savingOffer}>Cancelar</button>
              <button className="button button-primary" type="submit" disabled={savingOffer}>{savingOffer ? 'Salvando...' : offerEditor.offer ? 'Salvar alterações' : 'Cadastrar oferta'}</button></div>
          </form>
      </Dialog>}
      {confirmation && <Dialog titleId="offer-confirm-title" onClose={() => { setConfirmation(null); setFeedback('') }} busy={Boolean(busyOfferId)}>
        <div className={`account-confirm-icon confirm-${confirmation.action}`}><Icon name={confirmation.action === 'delete' ? 'trash' : confirmation.action === 'pause' ? 'pause' : 'play'} /></div>
        <h2 id="offer-confirm-title">{confirmation.action === 'delete' ? 'Remover esta oferta?' : confirmation.action === 'pause' ? 'Pausar esta oferta?' : 'Ativar esta oferta?'}</h2>
        <p className="account-confirm-description">{confirmation.action === 'delete' ? 'A oferta e suas fotos serão excluídas. Esta ação não pode ser desfeita.' : confirmation.action === 'pause' ? 'Ela deixará de aparecer no marketplace, mas você poderá ativá-la novamente enquanto estiver no prazo.' : 'A oferta aparecerá no marketplace durante o período de disponibilidade informado.'}</p>
        <p className="account-confirm-offer">{confirmation.offer.title}</p>
        {feedback && <p role="alert" className="account-feedback">{feedback}</p>}
        <div className="account-form-actions"><button type="button" className="button button-secondary" disabled={Boolean(busyOfferId)} onClick={() => setConfirmation(null)}>Cancelar</button>
          <button type="button" className={`button ${confirmation.action === 'delete' ? 'account-danger-button' : 'button-primary'}`} disabled={Boolean(busyOfferId)} onClick={() => void (confirmation.action === 'delete' ? removeOffer(confirmation.offer) : changeOfferStatus(confirmation.offer))}>{busyOfferId ? 'Salvando...' : confirmation.action === 'delete' ? 'Remover oferta' : confirmation.action === 'pause' ? 'Pausar oferta' : 'Ativar oferta'}</button></div>
      </Dialog>}
      {feedback && !offerEditor && !confirmation && <div className="account-toast" role="status">{feedback}<button type="button" aria-label="Fechar aviso" onClick={() => setFeedback('')}><Icon name="close" /></button></div>}
    </main>
  )
}

export { AccountPage }
