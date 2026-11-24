import { formatQuantity } from '../data/offerUnits'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { OfferGallery } from '../components/OfferGallery'
import { ProductCard } from '../components/ProductCard'
import { WhatsAppContact } from '../components/WhatsAppContact'
import { useOfferDetail } from '../hooks/useOfferDetail'
import { useMarketplaceOffers } from '../hooks/useMarketplaceOffers'
import { formatDate, formatPrice } from '../data/marketplace'
import { getOfferState } from '../data/products'
import { producerHref } from '../data/producers'
import { offerGallery, offerHref, readSavedOffers, relatedOffers, savedOffersKey, setOfferSaved } from '../data/offerDetail'
import type { UserSession } from '../services/auth'
import './OfferPage.css'

import { ReportForm } from '../components/ReportForm'
import type { Authorized } from '../services/moderation'

function subscribeToSavedOffers(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === savedOffersKey || event.key === null) notify()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

export function OfferPage({ offerId, session, restoring, auth, navigate, onSessionChange }: { offerId: string; session: UserSession | null; restoring: boolean; auth: Authorized; navigate: (href: string) => void; onSessionChange: (session: UserSession | null) => void }) {
  const { offer, loading, error, reloadOffer } = useOfferDetail(offerId)
  const { offers, loading: relatedLoading, error: relatedError, reloadOffers } = useMarketplaceOffers()
  const [feedback, setFeedback] = useState('')
  const [showShareLink, setShowShareLink] = useState(false)
  const shareLinkRef = useRef<HTMLInputElement>(null)
  const userId = session?.userId
  useEffect(() => {
    document.title = `${loading ? 'Oferta de camarão' : error ? 'Oferta indisponível' : offer?.title ?? 'Oferta não encontrada'} | RedeCamarão`
  }, [offer, loading, error])

  const saved = useSyncExternalStore(subscribeToSavedOffers, () => {
    try { return Boolean(userId) && readSavedOffers(window.localStorage).includes(offerId) } catch { return false }
  })

  function saveOffer() {
    if (restoring) return
    if (!session) {
      navigate(`/entrar?returnTo=${encodeURIComponent(offerHref(offerId))}`)
      return
    }
    try {
      const next = !readSavedOffers(window.localStorage).includes(offerId)
      setOfferSaved(window.localStorage, offerId, next, Boolean(session.userId))
      window.dispatchEvent(new StorageEvent('storage', { key: savedOffersKey }))
      setFeedback(next ? 'Oferta salva neste navegador.' : 'Oferta removida dos salvos.')
    } catch { setFeedback('Não foi possível salvar neste navegador. Tente novamente.') }
  }

  const shareUrl = `${window.location.origin}${offerHref(offerId)}`
  async function shareOffer() {
    if (!offer) return
    try {
      if (navigator.share) {
        await navigator.share({ title: offer.title, text: 'Confira esta oferta na RedeCamarão.', url: shareUrl })
        setFeedback('Compartilhamento concluído.')
        return
      }
    } catch (error) { if (error instanceof Error && error.name === 'AbortError') return }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(shareUrl)
      setFeedback('Link da oferta copiado.')
    } catch {
      setShowShareLink(true)
      setFeedback('Copie o link abaixo para compartilhar esta oferta.')
      requestAnimationFrame(() => { shareLinkRef.current?.focus(); shareLinkRef.current?.select() })
    }
  }

  if (loading || error || !offer) return (
    <main id="main-content" className="offer-page">
      <div className="container offer-container">
        <section className="offer-page-status" role={error ? 'alert' : 'status'}>
          <Icon name={loading ? 'waves' : 'info'} />
          <h1>{loading ? 'Carregando oferta...' : error ? 'Não foi possível carregar esta oferta' : 'Oferta não encontrada'}</h1>
          <p>{loading ? 'Estamos buscando as informações do lote e do produtor.' : error ?? 'Esta oferta pode ter sido encerrada ou não está mais disponível.'}</p>
          {error && <button type="button" className="button button-secondary" onClick={reloadOffer}>Tentar novamente</button>}
          {!loading && <a href="/produtos" className="button button-primary">Explorar produtos</a>}
        </section>
      </div>
    </main>
  )

  const related = relatedOffers(offer, offers)
  const inSameState = related.length > 0 && getOfferState(offer.location)
    && related.every(item => getOfferState(item.location) === getOfferState(offer.location))
  const producer = offer.producer

  return (
    <main id="main-content" className="offer-page">
      <div className="container offer-container">
        <div className="offer-actions">
          {session && session.userType !== 'ADMIN' && session.userId !== producer.id && <ReportForm auth={auth} offerId={offerId}/>}
          <button type="button" className="button button-secondary" onClick={shareOffer}><Icon name="share" />Compartilhar</button>
          <button type="button" className="button button-secondary" aria-label={session ? 'Salvar oferta' : 'Salvar oferta — entrar na conta'} aria-pressed={session ? saved : undefined} disabled={restoring} onClick={saveOffer}><Icon name="bookmark" />{saved ? 'Salvo' : 'Salvar'}</button>
          <p className={feedback ? 'offer-action-feedback' : 'visually-hidden'} role="status">{feedback}</p>
        </div>
        {showShareLink && <div className="offer-share-link"><label htmlFor="offer-share-url">Link da oferta</label><input id="offer-share-url" ref={shareLinkRef} value={shareUrl} readOnly onFocus={event => event.target.select()} /></div>}

        <div className="offer-layout">
          <OfferGallery photos={offerGallery(offer)} />
          <section className="offer-summary" aria-labelledby="offer-title">
            <div className="offer-summary-labels"><span className="offer-type">{offer.type || 'Camarão'}</span><span className="offer-stock"><span aria-hidden="true">●</span> Disponível agora</span></div>
            <h1 id="offer-title" className="offer-title">{offer.title}</h1>
            <p className="offer-reference" title={`Identificador completo: ${offer.id}`}>Oferta #{offer.id.slice(0, 8)} · Publicada em {new Date(offer.createdAt).toLocaleDateString('pt-BR')}</p>
            <p className="offer-detail-price">{formatPrice(offer.price)} <small>por kg</small></p>
            <dl className="offer-specifications">
              <div><dt><Icon name="box" />Quantidade disponível</dt><dd>{formatQuantity(offer.weight)}</dd></div>
              <div><dt><Icon name="ruler" />Tamanho</dt><dd>{offer.size}</dd></div>
              <div><dt><Icon name="pin" />Localização</dt><dd>{offer.location}</dd></div>
              <div><dt><Icon name="calendar" />Disponibilidade</dt><dd>Até {formatDate(offer.endDate)}</dd></div>
            </dl>
            <div className="offer-contact-actions"><WhatsAppContact producerId={producer.id} session={session} restoring={restoring} onSessionChange={onSessionChange} className="button offer-contact-button" message={`Olá! Tenho interesse na oferta “${offer.title}” da RedeCamarão e gostaria de conversar sobre preço, retirada e disponibilidade.`} /></div>
          </section>

          <section className="offer-about" aria-labelledby="offer-about-title">
            <h2 id="offer-about-title">Sobre esta oferta</h2>
            <p className="offer-description-full">{offer.description}</p>
            <dl className="offer-facts">
              <div><Icon name="box" /><dt>Lote mínimo</dt><dd>{formatQuantity(offer.minimumQuantity)}</dd></div>
              <div><Icon name="ruler" /><dt>Lote máximo</dt><dd>{formatQuantity(offer.maximumQuantity)}</dd></div>
              <div><Icon name="calendar" /><dt>Disponível a partir de</dt><dd>{formatDate(offer.startDate)}</dd></div>
            </dl>
          </section>
          <aside className="offer-producer" aria-labelledby="offer-producer-name">
            <div className="offer-producer-heading"><Avatar className="offer-producer-avatar" src={producer.profilePicture} /><div><h2 id="offer-producer-name">{producer.name}</h2><p>{producer.location || 'Produtor na RedeCamarão'}</p></div></div>
            <p className="offer-producer-description">{producer.description || 'Este produtor ainda não adicionou uma apresentação.'}</p>
            <dl className="offer-producer-facts">
              <div><dt>Ofertas ativas</dt><dd>{producer.activeOfferCount}</dd></div>
              {producer.businessHours && <div><dt>Horário de atendimento</dt><dd>{producer.businessHours}</dd></div>}
            </dl>
            <div className="offer-producer-contact"><p>A negociação e o pagamento são combinados diretamente entre comprador e produtor.</p></div>
            <a className="button button-secondary" href={producerHref(producer.id)}>Ver perfil do produtor<Icon name="arrow" /></a>
          </aside>
        </div>

        <section className="offer-related" aria-labelledby="offer-related-title">
          <div className="offer-section-heading"><h2 id="offer-related-title">{inSameState ? 'Outras ofertas na região' : 'Outras ofertas'}</h2><a className="button button-secondary" href="/produtos">Ver todos os produtos<Icon name="arrow" /></a></div>
          {relatedLoading ? <p className="offer-related-empty" role="status">Buscando outras ofertas...</p>
            : relatedError ? <div className="offer-related-empty"><p>Não foi possível carregar outras ofertas.</p><button type="button" className="button button-secondary" onClick={reloadOffers}>Tentar novamente</button></div>
              : related.length ? <div className="offer-related-grid">{related.map(item => <ProductCard key={item.id} offer={item} />)}</div>
                : <p className="offer-related-empty">Não há outras ofertas disponíveis no momento.</p>}
        </section>
      </div>
    </main>
  )
}
