import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { ProductCard } from '../components/ProductCard'
import { formatDate, formatPrice } from '../data/marketplace'
import type { OfferDetail } from '../data/marketplace'
import { readSavedOffers, savedOffersKey, setOfferSaved } from '../data/offerDetail'
import { producerHref } from '../data/producers'
import { logoutUser, restoreSession } from '../services/auth'
import type { UserSession } from '../services/auth'
import { fetchOfferDetail } from '../services/offers'
import {
  createOffer, deleteOffer, fetchMyOffers, fetchMyProfile, updateMyProfile, updateOffer,
} from '../services/account'
import type { ManagedOffer, NewOffer, OfferStatus, ProfileUpdate, UserProfile } from '../services/account'
import './AccountPage.css'

const statusNames: Record<OfferStatus, string> = {
  ACTIVE: 'Ativa', INACTIVE: 'Pausada', EXPIRED: 'Expirada', SOLD_OUT: 'Vendida', CANCELLED: 'Cancelada',
}
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
const localDateString = (offsetDays = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
  }
}

function AccountPage({ session, onSessionChange }: {
  session: UserSession | null
  onSessionChange: (session: UserSession | null) => void
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
  }, [profile])

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return offers.filter(offer => (statusFilter === 'ALL' || offer.status === statusFilter)
      && (!query || `${offer.title} ${offer.location}`.toLocaleLowerCase('pt-BR').includes(query)))
  }, [offers, search, statusFilter])
  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleOffers = filteredOffers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeCount = offers.filter(offer => offer.status === 'ACTIVE').length
  const pausedCount = offers.filter(offer => offer.status === 'INACTIVE').length
  const completedCount = offers.filter(offer => ['EXPIRED', 'SOLD_OUT', 'CANCELLED'].includes(offer.status)).length
  const savedOffersLoading = profile?.userType === 'BUYER' && savedLoadedKey !== savedRequestKey

  function openCreateOffer() {
    setOfferEditor({ offer: null, values: { ...emptyOffer } })
    setFeedback('')
    requestAnimationFrame(() => offerTitleRef.current?.focus())
  }

  function openEditOffer(offer: ManagedOffer) {
    setOfferEditor({ offer, values: initialOfferForm(offer) })
    setFeedback('')
    requestAnimationFrame(() => offerTitleRef.current?.focus())
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !offerEditor || pending.current) return
    const { offer, values } = offerEditor
    if (new Date(values.endDate) < new Date(values.startDate)) {
      setFeedback('A data final não pode ser anterior à data inicial.')
      return
    }
    if (!offer && Number(values.minimumQuantity) > Number(values.maximumQuantity)) {
      setFeedback('A quantidade mínima não pode exceder a quantidade máxima.')
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
        setFeedback('Oferta cadastrada como rascunho. Ative-a na lista para publicá-la.')
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
      setFeedback(status === 'ACTIVE' ? 'Oferta ativada e publicada.' : 'Oferta pausada e removida do marketplace.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível alterar o status da oferta.')
    } finally { pending.current = false; setBusyOfferId('') }
  }

  async function removeOffer(offer: ManagedOffer) {
    if (!session || pending.current || !window.confirm(`Excluir “${offer.title}”? Esta ação não pode ser desfeita.`)) return
    pending.current = true
    setBusyOfferId(offer.id)
    setFeedback('')
    try {
      await withSession(token => deleteOffer(token, offer.id))
      setOffers(current => current.filter(item => item.id !== offer.id))
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
    <main id="main-content" className="account-main">
      <div className="container account-container">
        <section className="account-welcome">
          <div><p className="account-eyebrow">{profile.userType === 'PRODUCER' ? 'PAINEL DO PRODUTOR' : 'PERFIL DO COMPRADOR'}</p>
            <h1>Olá, {profile.name}!</h1>
            <p>{profile.userType === 'PRODUCER' ? 'Acompanhe seus dados e mantenha seu perfil atualizado.' : 'Encontre ofertas salvas e mantenha seus dados atualizados para comprar com mais facilidade.'}</p></div>
          <button type="button" className="button button-secondary account-logout" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'Saindo...' : 'Sair da conta'}
          </button>
        </section>

        {profile.userType === 'PRODUCER' && <>
          <section className="account-metrics" aria-label="Resumo das ofertas">
            <article><span>Ofertas ativas</span><strong>{activeCount}</strong><small>Publicadas no marketplace</small></article>
            <article><span>Ofertas pausadas</span><strong>{pausedCount}</strong><small>Podem ser ativadas novamente</small></article>
            <article><span>Outros status</span><strong>{completedCount}</strong><small>Vendidas, expiradas ou canceladas</small></article>
            <article><span>Total de ofertas</span><strong>{offers.length}</strong><small>Inclui rascunhos</small></article>
          </section>

          <section id="ofertas" className="account-offers" aria-labelledby="account-offers-title">
            <div className="account-section-heading">
              <div><h2 id="account-offers-title">Minhas ofertas</h2><p>{offers.length} {offers.length === 1 ? 'oferta no total' : 'ofertas no total'}</p></div>
              <div className="account-section-actions"><a className="button button-secondary" href={producerHref(session.userId)}>Ver perfil público</a>
                <button type="button" className="button button-primary" onClick={openCreateOffer}><span aria-hidden="true">+</span> Cadastrar oferta</button></div>
            </div>
            <div className="account-toolbar">
              <label className="account-search"><Icon name="search" /><span className="visually-hidden">Buscar oferta</span>
                <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar oferta" /></label>
              <label className="account-filter"><span className="visually-hidden">Filtrar por status</span>
                <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as OfferStatus | 'ALL'); setPage(1) }}>
                  {statusFilters.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select></label>
            </div>
            {visibleOffers.length ? <div className="account-table-wrap"><table className="account-table">
              <thead><tr><th>Oferta</th><th>Preço</th><th>Quantidade</th><th>Status</th><th>Atualização</th><th>Ações</th></tr></thead>
              <tbody>{visibleOffers.map(offer => <tr key={offer.id}>
                <td><div className="account-offer-name"><span className="account-offer-icon"><Icon name="waves" /></span>
                  <div><strong>{offer.title}</strong><small>{offer.type || 'Oferta de camarão'} · #{offer.id.slice(0, 6)}</small></div></div></td>
                <td>{formatPrice(offer.price)}<small className="account-cell-sub">/kg</small></td>
                <td>{offer.weight.toLocaleString('pt-BR')} kg</td>
                <td><span className={`offer-status status-${offer.status.toLowerCase()}`}>{statusNames[offer.status]}</span></td>
                <td>{formatDate(offer.endDate)}<small className="account-cell-sub">Término</small></td>
                <td><div className="account-row-actions">
                  <button type="button" aria-label={`Editar ${offer.title}`} onClick={() => openEditOffer(offer)}><Icon name="edit" />Editar</button>
                  {(offer.status === 'ACTIVE' || (offer.status === 'INACTIVE' && dateField(offer.endDate) >= localDateString())) && <button type="button" aria-label={`${offer.status === 'ACTIVE' ? 'Pausar' : 'Ativar'} ${offer.title}`} disabled={busyOfferId === offer.id} onClick={() => void changeOfferStatus(offer)}>
                    <Icon name={offer.status === 'ACTIVE' ? 'pause' : 'play'} />{offer.status === 'ACTIVE' ? 'Pausar' : 'Ativar'}</button>}
                  <button type="button" className="account-delete" aria-label={`Excluir ${offer.title}`} disabled={busyOfferId === offer.id} onClick={() => void removeOffer(offer)}><Icon name="trash" /><span className="visually-hidden">Excluir</span></button>
                </div></td>
              </tr>)}</tbody>
            </table></div> : <div className="account-empty"><Icon name="box" /><h3>{offers.length ? 'Nenhuma oferta encontrada' : 'Você ainda não cadastrou ofertas'}</h3>
              <p>{offers.length ? 'Ajuste a busca ou selecione outro status.' : 'Cadastre sua primeira oferta para apresentá-la aos compradores.'}</p>
              {!offers.length && <button type="button" className="button button-primary" onClick={openCreateOffer}>Cadastrar primeira oferta</button>}
            </div>}
            {filteredOffers.length > 0 && <div className="account-pagination">
              <span>Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredOffers.length)} de {filteredOffers.length}</span>
              <div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
                <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</button></div>
            </div>}
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
            {!profileEditing && <button type="button" className="button button-secondary" onClick={() => { setProfileEditing(true); requestAnimationFrame(() => profileNameRef.current?.focus()) }}><Icon name="edit" />Editar perfil</button>}
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
        </section>
      </div>
      {offerEditor && <div className="account-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !savingOffer) setOfferEditor(null) }}>
        <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="offer-editor-title">
          <div className="account-modal-heading"><div><p className="account-eyebrow">{offerEditor.offer ? 'GERENCIAR OFERTA' : 'NOVA PUBLICAÇÃO'}</p>
            <h2 id="offer-editor-title">{offerEditor.offer ? 'Editar oferta' : 'Cadastrar oferta'}</h2></div>
            <button type="button" aria-label="Fechar" disabled={savingOffer} onClick={() => setOfferEditor(null)}>×</button></div>
          <form onSubmit={submitOffer} className="account-offer-form">
            <label className="offer-field-wide">Nome da oferta<input ref={offerTitleRef} required maxLength={255} value={offerEditor.values.title} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, title: event.target.value } }))} /></label>
            <label>Tipo<input required maxLength={255} value={offerEditor.values.type} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, type: event.target.value } }))} /></label>
            <label>Tamanho<input required maxLength={255} value={offerEditor.values.size} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, size: event.target.value } }))} /></label>
            <label>Preço por kg (R$)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.price} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, price: event.target.value } }))} /></label>
            <label>Quantidade (kg)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.weight} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, weight: event.target.value } }))} /></label>
            <label>Localização<input required maxLength={255} value={offerEditor.values.location} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, location: event.target.value } }))} /></label>
            <label>Disponível a partir de<input required type="date" value={offerEditor.values.startDate} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, startDate: event.target.value } }))} /></label>
            <label>Disponível até<input required type="date" value={offerEditor.values.endDate} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, endDate: event.target.value } }))} /></label>
            {!offerEditor.offer && <>
              <label>Quantidade mínima (kg)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.minimumQuantity} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, minimumQuantity: event.target.value } }))} /></label>
              <label>Quantidade máxima (kg)<input required type="number" min="0.01" step="0.01" value={offerEditor.values.maximumQuantity} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, maximumQuantity: event.target.value } }))} /></label>
              <label className="offer-field-wide">Descrição<textarea required maxLength={1000} rows={4} value={offerEditor.values.description} onChange={event => setOfferEditor(current => current && ({ ...current, values: { ...current.values, description: event.target.value } }))} /></label>
            </>}
            <p className="account-modal-note offer-field-wide"><Icon name="info" />Ao cadastrar uma oferta, ela fica como rascunho até você ativá-la na lista.</p>
            <div className="account-form-actions offer-field-wide"><button className="button button-secondary" type="button" onClick={() => setOfferEditor(null)} disabled={savingOffer}>Cancelar</button>
              <button className="button button-primary" type="submit" disabled={savingOffer}>{savingOffer ? 'Salvando...' : offerEditor.offer ? 'Salvar alterações' : 'Cadastrar oferta'}</button></div>
          </form>
        </section>
      </div>}
      {feedback && !offerEditor && <div className="account-toast" role="status">{feedback}</div>}
    </main>
  )
}

export { AccountPage }
