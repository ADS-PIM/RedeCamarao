import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { filterOffers, formatDate, formatPrice } from '../data/marketplace'
import type { Category, Offer } from '../data/marketplace'
import { fetchMarketplaceOffers } from '../services/offers'
import './MarketplacePage.css'

const categories: { id: Category; title: string; icon: IconName }[] = [
  { id: 'gray', title: 'Camarão cinza', icon: 'waves' },
  { id: 'white', title: 'Camarão branco', icon: 'sparkle' },
  { id: 'large', title: 'Tamanho grande', icon: 'ruler' },
  { id: 'bulk', title: 'Lotes acima de 50 kg', icon: 'box' },
  { id: 'nearby', title: 'Perto de você', icon: 'pin' },
]

function scrollToOffers() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('ofertas')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
}

function DetailDialog({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = originalOverflow }
  }, [])
  return (
    <dialog ref={ref} className="market-dialog" aria-labelledby="detail-title" onClose={event => { if (!event.currentTarget.open) onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <button className="dialog-close" type="button" aria-label="Fechar detalhes" onClick={onClose} autoFocus><Icon name="close" /></button>
      <div className="detail-content">
        <span className="market-eyebrow">{offer.type || 'Oferta de camarão'}</span>
        <h2 id="detail-title">{offer.title}</h2>
        <p>{offer.location}</p>
        <p>{offer.description}</p>
        <p>{offer.size} · Lote de {offer.weight} kg</p>
        <p>Quantidade: {offer.minimumQuantity}–{offer.maximumQuantity} kg</p>
        <p>Disponível de {formatDate(offer.startDate)} até {formatDate(offer.endDate)}</p>
        <p className="detail-price">{formatPrice(offer.price)} <small>/ kg</small></p>
        <button className="button button-secondary" type="button" onClick={onClose}>Voltar ao marketplace</button>
      </div>
    </dialog>
  )
}

export function MarketplacePage() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [region, setRegion] = useState('')
  const [detail, setDetail] = useState<Offer | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const filteredOffers = filterOffers(offers, query, category, region)
  const filtering = Boolean(query.trim() || category)
  const offersDescription = loading
    ? 'Carregando ofertas...'
    : error
      ? 'Consulte as ofertas dos produtores assim que a conexão for restabelecida.'
      : filtering
        ? `${filteredOffers.length} ${filteredOffers.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}${query ? ` para “${query}”` : ''}`
        : `${offers.length} ${offers.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'} para sua próxima negociação`

  useEffect(() => {
    let active = true
    fetchMarketplaceOffers()
      .then(data => { if (active) setOffers(data) })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as ofertas.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  function reloadOffers() {
    setLoading(true)
    setError(null)
    setReload(value => value + 1)
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(input.trim())
    scrollToOffers()
  }

  function clearFilters() { setInput(''); setQuery(''); setCategory(null); setRegion('') }

  function selectCategory(value: Category | null) {
    setCategory(value)
    setQuery('')
    setInput('')
    setRegion('')
  }

  function categoryDescription(value: Category) {
    if (loading) return 'Carregando...'
    if (error) return 'Explorar ofertas'
    const count = filterOffers(offers, '', value, region).length
    return `${count} ${count === 1 ? 'oferta' : 'ofertas'}`
  }

  return (
    <main id="main-content" className="marketplace-main">
      <section className="market-hero" aria-labelledby="marketplace-title">
        <div className="container market-hero-layout">
          <div className="market-hero-copy">
            <p className="market-eyebrow">Negociação direta</p>
            <h1 id="marketplace-title">Entre em contato com os produtores de maneira fácil</h1>
            <p className="market-hero-description">Compare ofertas por região, tamanho e quantidade. Fale com o produtor e combine os detalhes fora da plataforma.</p>
            <form className="market-search" role="search" onSubmit={search}>
              <Icon name="search" />
              <input type="search" aria-label="Buscar camarão, tamanho ou região" placeholder="Buscar camarão, tamanho ou região" value={input} onChange={event => setInput(event.target.value)} />
              <button className="button button-primary" type="submit">Buscar</button>
            </form>
            <div className="popular-searches">
              <span>Buscas populares:</span>
              <button type="button" onClick={() => { selectCategory('large'); scrollToOffers() }}>camarão grande</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => { selectCategory('nearby'); setRegion('CE'); scrollToOffers() }}>Ceará</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => { selectCategory('bulk'); scrollToOffers() }}>acima de 50 kg</button>
            </div>
          </div>
          <aside className="how-card" id="como-funciona" aria-labelledby="how-title">
            <img className="farm-image" src="/images/shrimp-farm.jpg" alt="Vista aérea de viveiros de camarão próximos ao litoral" width="1200" height="675" fetchPriority="high" />
            <div className="how-card-content">
              <h2 id="how-title">Do produtor para sua negociação</h2>
              <ol className="how-steps">
                <li><Icon name="search" /><div><span>01</span><strong>Encontre</strong></div></li>
                <li><Icon name="chat" /><div><span>02</span><strong>Converse</strong></div></li>
                <li><Icon name="handshake" /><div><span>03</span><strong>Combine</strong></div></li>
              </ol>
              <p>Sem pagamento, entrega ou logística dentro da plataforma.</p>
            </div>
          </aside>
        </div>
      </section>

      <div className="container marketplace-content">
        <section className="category-section" aria-labelledby="category-title">
          <h2 id="category-title">Explore por categoria</h2>
          <p className="section-description">Atalhos para começar sua busca</p>
          <div className="category-grid">
            {categories.map(item => <button className={`category-card ${category === item.id ? 'is-selected' : ''}`} key={item.id} type="button" aria-pressed={category === item.id} onClick={() => selectCategory(category === item.id ? null : item.id)}>
              <span className="category-icon"><Icon name={item.icon} /></span><span><strong>{item.title}</strong><small>{categoryDescription(item.id)}</small></span>
            </button>)}
          </div>
          {category === 'nearby' && (
            <div className="region-filter">
              <label htmlFor="market-region">Selecione sua região</label>
              <select id="market-region" value={region} onChange={event => setRegion(event.target.value)}>
                <option value="">Todas as regiões</option>
                <option value="CE">Ceará</option>
                <option value="RN">Rio Grande do Norte</option>
              </select>
            </div>
          )}
        </section>

        <section className="offers-section" id="ofertas" aria-labelledby="offers-title">
          <div className="section-heading">
            <div>
              <p className="market-eyebrow">Ofertas ativas</p>
              <h2 id="offers-title">{filtering ? 'Ofertas encontradas' : 'Ofertas disponíveis'}</h2>
              <p className="section-description">{offersDescription}</p>
            </div>
            {filtering && <button className="button button-secondary view-all" type="button" onClick={clearFilters}><Icon name="close" />Limpar filtros</button>}
          </div>
          <div className="offer-grid" aria-live="polite" aria-atomic="true" aria-busy={loading}>
            {loading && <div className="offers-loading" role="status">Carregando ofertas...</div>}
            {!loading && error && <div className="empty-offers" role="alert"><Icon name="info" /><h3>Não foi possível carregar as ofertas</h3><p>{error}</p><button type="button" className="button button-secondary" onClick={reloadOffers}>Tentar novamente</button></div>}
            {!loading && !error && filteredOffers.map(offer => <article className="offer-card" key={offer.id}>
              <div className="offer-content">
                <div className="offer-labels"><span>{offer.type || 'Camarão'}</span><span className="offer-availability"><span aria-hidden="true">●</span> Disponível</span></div>
                <h3>{offer.title}</h3>
                <p className="offer-description">{offer.description}</p>
                <div className="offer-specs"><span>{offer.size} · {offer.weight} kg</span><span><Icon name="pin" />{offer.location}</span></div>
                <div className="offer-bottom"><p className="offer-price">{formatPrice(offer.price)} <small>/ kg</small></p><button className="button button-secondary" type="button" aria-label={`Ver oferta: ${offer.title}`} onClick={() => setDetail(offer)}>Ver oferta</button></div>
              </div>
            </article>)}
            {!loading && !error && filteredOffers.length === 0 && <div className="empty-offers"><Icon name="search" /><h3>{offers.length === 0 ? 'Ainda não há ofertas disponíveis' : 'Nenhuma oferta encontrada'}</h3><p>{offers.length === 0 ? 'Novas ofertas aparecerão aqui quando forem publicadas pelos produtores.' : 'Tente outro produto, tamanho ou região.'}</p></div>}
          </div>
        </section>
      </div>
      {detail && <DetailDialog offer={detail} onClose={() => setDetail(null)} />}
    </main>
  )
}
