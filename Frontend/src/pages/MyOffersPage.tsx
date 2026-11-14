import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Dialog } from '../components/Dialog'
import { Pagination } from '../components/Pagination'
import { formatPrice } from '../data/marketplace'
import { offerHref, offerIllustration } from '../data/offerDetail'
import { editOfferHref, newOfferHref } from '../data/offerEditor'
import { canActivateOffer, isPublishedOffer, offerStatusNames, selectManagedOffers } from '../data/account'
import type { ManagedOfferTab, ManagedOfferSort } from '../data/account'
import { useAuthenticatedAction } from '../hooks/useAuthenticatedAction'
import { deleteOffer, fetchMyOffers, fetchMyProfile, updateOffer } from '../services/account'
import type { ManagedOffer } from '../services/account'
import type { UserSession } from '../services/auth'
import './AccountPage.css'
import './MyOffersPage.css'

function OfferThumb({ offer }: { offer: ManagedOffer }) {
  const [failed, setFailed] = useState(false)
  const real = offer.coverPhoto && !failed
  return <span className="account-offer-image"><img src={real ? offer.coverPhoto! : offerIllustration(offer)} alt="" width="72" height="64" loading="lazy" onError={() => setFailed(true)} />{!real && <span>Ilustrativa</span>}</span>
}
function SelectAll({ checked, partial, onChange }: { checked: boolean; partial: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = partial }, [partial])
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label="Selecionar ofertas desta página" />
}
export function MyOffersPage({ session, restoring, onSessionChange, onProfileLoad }: {
  session: UserSession | null; restoring: boolean; onSessionChange: (session: UserSession | null) => void; onProfileLoad: (name: string) => void
}) {
  const [offers, setOffers] = useState<ManagedOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<ManagedOfferTab>('ALL')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ManagedOfferSort>('recent')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [confirm, setConfirm] = useState<{ action: 'pause' | 'activate' | 'delete'; offers: ManagedOffer[] } | null>(null)
  const action = useAuthenticatedAction(session, onSessionChange)
  useEffect(() => {
    document.title = 'Minhas ofertas | RedeCamarão'
    if (restoring || !session || session.userType !== 'PRODUCER') return
    let active = true
    Promise.resolve().then(async () => {
      setLoading(true); setLoadError('')
      const [data, profile] = await Promise.all([action(token => fetchMyOffers(token, session.userId)), action(fetchMyProfile)])
      if (active) { setOffers(data); onProfileLoad(profile.name) }
    }).catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar suas ofertas.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session?.userId, session?.userType, restoring, attempt, action, onProfileLoad])
  useEffect(() => {
    const dismiss = (event: Event) => document.querySelectorAll<HTMLDetailsElement>('.account-more[open]').forEach(menu => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event.type === 'pointerdown' && event.target instanceof Node && menu.contains(event.target)) return
      menu.open = false
      if (event instanceof KeyboardEvent) menu.querySelector<HTMLElement>('summary')?.focus()
    })
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', dismiss)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss) }
  }, [])
  const tabs: { id: ManagedOfferTab; label: string; count: number }[] = [
    { id: 'ALL', label: 'Todas', count: offers.length }, { id: 'ACTIVE', label: 'Ativas', count: offers.filter(offer => offer.status === 'ACTIVE').length },
    { id: 'INACTIVE', label: 'Pausadas', count: offers.filter(offer => offer.status === 'INACTIVE').length },
    { id: 'DRAFT', label: 'Rascunhos', count: offers.filter(offer => offer.status === 'DRAFT').length },
    { id: 'CLOSED', label: 'Encerradas', count: offers.filter(offer => ['EXPIRED', 'SOLD_OUT', 'CANCELLED'].includes(offer.status)).length },
  ]
  const filtered = selectManagedOffers(offers, search, tab, sort)
  const totalPages = Math.max(1, Math.ceil(filtered.length / 6))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6)
  const pauseTargets = offers.filter(offer => selected.includes(offer.id) && offer.status === 'ACTIVE')
  function resetPage() { setPage(1); setSelected([]) }
  function ask(offer: ManagedOffer, type: 'pause' | 'activate' | 'delete') { setError(''); setFeedback(''); setConfirm({ action: type, offers: [offer] }) }
  async function apply() {
    if (!confirm || !session || pending.current) return
    pending.current = true; setBusy(true); setError(''); setFeedback('')
    let succeeded = 0
    try {
      for (const offer of confirm.offers) {
        if (confirm.action === 'delete') await action(token => deleteOffer(token, offer.id))
        else await action(token => updateOffer(token, offer.id, { status: confirm.action === 'pause' ? 'INACTIVE' : 'ACTIVE' }))
        succeeded++
      }
      setOffers(await action(token => fetchMyOffers(token, session.userId)))
      setSelected([]); setConfirm(null)
      setFeedback(confirm.action === 'delete' ? 'Oferta removida.' : confirm.action === 'pause' ? `${succeeded === 1 ? 'Oferta pausada' : `${succeeded} ofertas pausadas`}.` : 'Oferta ativada. Ela será exibida durante o período de disponibilidade.')
    } catch (error) {
      if (succeeded) { try { setOffers(await action(token => fetchMyOffers(token, session.userId))); setSelected([]) } catch { /* Keep the last confirmed list until retry. */ } }
      setError(`${succeeded ? `${succeeded} alterações concluídas. ` : ''}${error instanceof Error ? error.message : 'Não foi possível concluir a ação.'}`)
      if (succeeded) setConfirm(null)
    } finally { pending.current = false; setBusy(false) }
  }
  if (restoring || !session || session.userType !== 'PRODUCER' || loading || loadError) return <main id="main-content" className="account-main"><section className="container account-status" role={loadError ? 'alert' : 'status'}><Icon name={restoring || (session?.userType === 'PRODUCER' && loading) ? 'waves' : 'info'} /><h1>{restoring ? 'Carregando sua conta...' : !session ? 'Entre para acessar suas ofertas' : session.userType !== 'PRODUCER' ? 'Área exclusiva do produtor' : loading ? 'Carregando suas ofertas...' : 'Não foi possível carregar suas ofertas'}</h1><p>{loadError || 'Gerencie os anúncios da sua fazenda com sua conta de produtor.'}</p>{loadError && <button className="button button-secondary" type="button" onClick={() => setAttempt(current => current + 1)}>Tentar novamente</button>}{!session && !restoring && <a className="button button-primary" href="/entrar">Entrar</a>}{session?.userType === 'BUYER' && <a className="button button-secondary" href="/painel">Minha conta</a>}</section></main>
  return <main id="main-content" className="account-main my-offers-main"><div className="container account-container">
    <section className="account-welcome"><div><h1>Minhas ofertas</h1><p>Gerencie suas ofertas, atualize o estoque e acompanhe o que está no marketplace.</p></div><a className="button button-primary account-create" href={newOfferHref}><Icon name="plus" />Cadastrar nova oferta</a></section>
    <section className="account-offers my-offers-panel" aria-label="Gerenciar ofertas">
      <div className="my-offers-tabs" role="group" aria-label="Filtrar ofertas por status">{tabs.filter(item => item.id !== 'CLOSED' || item.count > 0).map(item => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => { setTab(item.id); resetPage() }}>{item.label}<span>{item.count}</span></button>)}</div>
      <div className="my-offers-toolbar"><label className="account-search search-field"><Icon name="search" /><span className="visually-hidden">Buscar por nome ou código da oferta</span><input value={search} placeholder="Buscar por nome ou código da oferta" onChange={event => { setSearch(event.target.value); resetPage() }} /></label><p role="status">{filtered.length} {filtered.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}</p><label className="account-filter"><span className="visually-hidden">Ordenar ofertas</span><select value={sort} onChange={event => { setSort(event.target.value as ManagedOfferSort); resetPage() }}><option value="recent">Mais recentes primeiro</option><option value="oldest">Mais antigas primeiro</option><option value="price-asc">Menor preço</option><option value="quantity-desc">Maior quantidade</option></select></label></div>
      {selected.length > 0 && <div className="my-offers-selection"><span>{selected.length} {selected.length === 1 ? 'oferta selecionada' : 'ofertas selecionadas'}</span><button type="button" disabled={!pauseTargets.length || busy} onClick={() => { setError(''); setFeedback(''); setConfirm({ action: 'pause', offers: pauseTargets }) }}>Pausar ativas ({pauseTargets.length})</button><button type="button" onClick={() => setSelected([])}>Limpar seleção</button></div>}
      {feedback && <p className="editor-success" role="status">{feedback}</p>}{error && !confirm && <p className="editor-error" role="alert">{error}</p>}
      {visible.length ? <div className="account-table-wrap"><table className="account-table my-offers-table"><caption className="visually-hidden">Suas ofertas e ações de gerenciamento</caption><thead><tr><th scope="col" className="my-offers-select"><SelectAll checked={visible.every(offer => selected.includes(offer.id))} partial={visible.some(offer => selected.includes(offer.id)) && !visible.every(offer => selected.includes(offer.id))} onChange={() => setSelected(visible.every(offer => selected.includes(offer.id)) ? [] : visible.map(offer => offer.id))} /></th><th scope="col">Oferta</th><th scope="col">Preço</th><th scope="col">Quantidade</th><th scope="col">Status</th><th scope="col">Atualização</th><th scope="col">Ações</th></tr></thead><tbody>{visible.map(offer => <tr key={offer.id}>
        <td className="my-offers-select"><input type="checkbox" checked={selected.includes(offer.id)} onChange={() => setSelected(current => current.includes(offer.id) ? current.filter(id => id !== offer.id) : [...current, offer.id])} aria-label={`Selecionar ${offer.title}`} /></td>
        <td className="my-offers-name"><div className="account-offer-name"><OfferThumb key={`${offer.id}:${offer.coverPhoto}`} offer={offer} /><div><strong>{offer.title}</strong><small>#{offer.id.slice(0, 8)}</small></div></div></td>
        <td data-label="Preço"><strong>{formatPrice(offer.price)}</strong><small className="account-price-unit">/kg</small></td><td data-label="Quantidade">{offer.weight.toLocaleString('pt-BR')} kg</td><td data-label="Status"><span className={`offer-status status-${offer.status.toLowerCase()}`}>{offerStatusNames[offer.status]}</span></td><td data-label="Atualização"><time dateTime={offer.updatedAt ?? offer.createdAt}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(offer.updatedAt ?? offer.createdAt))}</time></td>
        <td><div className="account-row-actions"><a href={editOfferHref(offer.id)} aria-label={`Editar ${offer.title}`}><Icon name="edit" />Editar</a>{offer.status === 'DRAFT' ? <a href={editOfferHref(offer.id)}>Continuar</a> : offer.status === 'ACTIVE' || canActivateOffer(offer) ? <button type="button" disabled={busy} onClick={() => ask(offer, offer.status === 'ACTIVE' ? 'pause' : 'activate')} aria-label={`${offer.status === 'ACTIVE' ? 'Pausar' : 'Ativar'} ${offer.title}`}><Icon name={offer.status === 'ACTIVE' ? 'pause' : 'play'} />{offer.status === 'ACTIVE' ? 'Pausar' : 'Ativar'}</button> : null}<details className="account-more"><summary aria-label={`Mais ações para ${offer.title}`}><Icon name="more" /></summary><div className="account-more-popover"><a href={`${newOfferHref}?duplicar=${encodeURIComponent(offer.id)}`}><Icon name="copy" />Duplicar oferta</a>{isPublishedOffer(offer) && <a href={offerHref(offer.id)}><Icon name="eye" />Visualizar página pública</a>}<button type="button" className="account-delete" disabled={busy} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); ask(offer, 'delete') }}><Icon name="trash" />Remover oferta</button></div></details></div></td>
      </tr>)}</tbody></table></div> : <div className="account-empty"><Icon name="box" /><h2>{offers.length ? 'Nenhuma oferta encontrada' : 'Você ainda não cadastrou ofertas'}</h2><p>{offers.length ? 'Ajuste a busca ou escolha outro status.' : 'Adicione fotos e informações do seu primeiro lote para começar.'}</p>{offers.length ? <button type="button" className="button button-secondary" onClick={() => { setSearch(''); setTab('ALL'); resetPage() }}>Limpar filtros</button> : <a className="button button-primary" href={newOfferHref}>Cadastrar primeira oferta</a>}</div>}
      {filtered.length > 0 && <div className="my-offers-pagination"><p>Mostrando {(currentPage - 1) * 6 + 1}–{Math.min(currentPage * 6, filtered.length)} de {filtered.length} ofertas</p>{totalPages > 1 ? <Pagination currentPage={currentPage} totalPages={totalPages} label="Paginação de minhas ofertas" onChange={next => { setPage(next); setSelected([]) }} /> : <p>Todas as ofertas encontradas estão nesta página.</p>}</div>}
    </section><p className="account-management-note my-offers-note"><Icon name="info" />As ofertas ativas aparecem no marketplace durante o período informado. Ofertas pausadas e rascunhos ficam fora do catálogo público.</p>
    {confirm && <Dialog titleId="my-offers-confirm-title" busy={busy} onClose={() => { setConfirm(null); setError('') }}><div className={`account-confirm-icon confirm-${confirm.action}`}><Icon name={confirm.action === 'delete' ? 'trash' : confirm.action === 'pause' ? 'pause' : 'play'} /></div><h2 id="my-offers-confirm-title">{confirm.action === 'delete' ? 'Remover esta oferta?' : confirm.action === 'activate' ? 'Ativar esta oferta?' : confirm.offers.length > 1 ? `Pausar ${confirm.offers.length} ofertas?` : 'Pausar esta oferta?'}</h2><p className="account-confirm-description">{confirm.action === 'delete' ? 'A oferta e seus registros de fotos serão excluídos. Esta ação não pode ser desfeita.' : confirm.action === 'pause' ? 'As ofertas deixarão de aparecer no marketplace. Você poderá ativá-las novamente enquanto estiverem no prazo.' : 'A oferta será exibida no marketplace durante seu período de disponibilidade.'}</p>{confirm.offers.length === 1 && <p className="account-confirm-offer">{confirm.offers[0].title}</p>}{error && <p className="account-feedback" role="alert">{error}</p>}<div className="account-form-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button><button type="button" className={`button ${confirm.action === 'delete' ? 'account-danger-button' : 'button-primary'}`} disabled={busy} onClick={() => void apply()}>{busy ? 'Salvando...' : confirm.action === 'delete' ? 'Remover oferta' : confirm.action === 'pause' ? 'Pausar ofertas' : 'Ativar oferta'}</button></div></Dialog>}
  </div></main>
}
