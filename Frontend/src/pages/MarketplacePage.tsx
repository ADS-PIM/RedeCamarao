import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { QuantityRangeFields } from '../components/QuantityRangeFields'
import { filterOffers, formatPrice } from '../data/marketplace'
import { emptyCatalogSelection, shrimpTypeOptions } from '../data/catalogFilters'
import type { CatalogSelection } from '../data/catalogFilters'
import { sizeOptions } from '../data/products'
import { useMarketplaceOffers } from '../hooks/useMarketplaceOffers'
import { offerHref } from '../data/offerDetail'
import { brazilianStates } from '../utils/registration'
import './MarketplacePage.css'

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

function scrollToOffers() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('ofertas')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
}

export function MarketplacePage() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<CatalogSelection>(emptyCatalogSelection)
  const { offers, loading, error, reloadOffers } = useMarketplaceOffers()
  const filteredOffers = filterOffers(offers, query, filters)
  const filtering = Boolean(query.trim() || filters.types.length || filters.sizes.length || filters.states.length || filters.minQuantity || filters.maxQuantity)
  const chips = [
    ...(query ? [{ id: 'query', label: `Busca: ${query}`, remove: () => { setInput(''); setQuery('') } }] : []),
    ...shrimpTypeOptions.filter(item => filters.types.includes(item.id)).map(item => ({ id: item.id, label: item.label, remove: () => setFilters(current => ({ ...current, types: toggle(current.types, item.id) })) })),
    ...sizeOptions.filter(item => filters.sizes.includes(item.id)).map(item => ({ id: item.id, label: item.label, remove: () => setFilters(current => ({ ...current, sizes: toggle(current.sizes, item.id) })) })),
    ...brazilianStates.filter(item => filters.states.includes(item.code)).map(item => ({ id: item.code, label: item.name, remove: () => setFilters(current => ({ ...current, states: toggle(current.states, item.code) })) })),
    ...(['minQuantity', 'maxQuantity'] as const).filter(field => filters[field]).map(field => ({ id: field, label: `${field === 'minQuantity' ? 'Lote a partir de' : 'Lote até'} ${filters[field]} ${filters.quantityUnit}`, remove: () => setFilters(current => ({ ...current, [field]: '' })) })),
  ]
  const offersDescription = loading
    ? 'Carregando ofertas...'
    : error
      ? 'Consulte as ofertas dos produtores assim que a conexão for restabelecida.'
      : filtering
        ? `${filteredOffers.length} ${filteredOffers.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}${query ? ` para “${query}”` : ''}`
        : `${offers.length} ${offers.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'} para sua próxima negociação`

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(input.trim())
    scrollToOffers()
  }

  function clearFilters() { setInput(''); setQuery(''); setFilters(emptyCatalogSelection) }

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
          </div>
          <aside className="how-card" id="como-funciona" aria-labelledby="how-title">
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
          <div className="market-filter-heading"><div><h2 id="category-title">Encontre o lote certo</h2>
            <p className="section-description">Combine os filtros. Você pode selecionar mais de uma opção em cada grupo.</p></div>
            {filtering && <button className="market-clear-filters" type="button" onClick={clearFilters}>Limpar filtros<Icon name="close" /></button>}
          </div>
          <div className="market-filter-grid">
            <div role="group" aria-labelledby="market-type-title" className={`market-filter-card${filters.types.length ? ' is-selected' : ''}`}>
              <h3 id="market-type-title"><Icon name="shrimp" />Tipo de camarão</h3><p>Selecione os tipos desejados</p>
              <div className="market-filter-options">{shrimpTypeOptions.map(item => <label key={item.id}>
                <input type="checkbox" checked={filters.types.includes(item.id)} onChange={() => setFilters(current => ({ ...current, types: toggle(current.types, item.id) }))} /><span>{item.label}</span>
              </label>)}</div>
            </div>
            <div role="group" aria-labelledby="market-size-title" className={`market-filter-card${filters.sizes.length ? ' is-selected' : ''}`}>
              <h3 id="market-size-title"><Icon name="ruler" />Tamanho</h3><p>Escolha um ou mais tamanhos</p>
              <div className="market-filter-options">{sizeOptions.map(item => <label key={item.id}>
                <input type="checkbox" checked={filters.sizes.includes(item.id)} onChange={() => setFilters(current => ({ ...current, sizes: toggle(current.sizes, item.id) }))} /><span>{item.label}</span>
              </label>)}</div>
            </div>
            <div role="group" aria-labelledby="market-lot-title" className={`market-filter-card${filters.minQuantity || filters.maxQuantity ? ' is-selected' : ''}`}>
              <h3 id="market-lot-title"><Icon name="box" />Lote disponível</h3><p>Defina a quantidade total do lote</p>
              <QuantityRangeFields idPrefix="market-lot" value={filters} onChange={setFilters} />
            </div>
            <div role="group" aria-labelledby="market-region-title" className={`market-filter-card${filters.states.length ? ' is-selected' : ''}`}>
              <h3 id="market-region-title"><Icon name="pin" />Região</h3><p>Selecione um ou mais estados</p>
              <details className="market-region-picker"><summary>{filters.states.length ? `${filters.states.length} ${filters.states.length === 1 ? 'estado selecionado' : 'estados selecionados'}` : 'Todos os estados'}<Icon name="chevron" /></summary>
                <div className="market-filter-options market-state-options">{brazilianStates.map(item => <label key={item.code}>
                  <input type="checkbox" checked={filters.states.includes(item.code)} onChange={() => setFilters(current => ({ ...current, states: toggle(current.states, item.code) }))} /><span>{item.name} ({item.code})</span>
                </label>)}</div>
              </details>
            </div>
          </div>
          {chips.length > 0 && <div className="market-active-filters" aria-label="Filtros ativos">{chips.map(chip => <button type="button" key={chip.id} onClick={chip.remove} aria-label={`Remover filtro: ${chip.label}`}>{chip.label}<Icon name="close" /></button>)}</div>}
        </section>

        <section className="offers-section" id="ofertas" aria-labelledby="offers-title">
          <div className="section-heading">
            <div>
              <p className="market-eyebrow">Ofertas ativas</p>
              <h2 id="offers-title">{filtering ? 'Ofertas encontradas' : 'Ofertas disponíveis'}</h2>
              <p className="section-description">{offersDescription}</p>
            </div>
            {!filtering && <a className="button button-secondary view-all" href="/produtos"><Icon name="arrow" />Ver todas</a>}
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
                <div className="offer-bottom"><p className="offer-price">{formatPrice(offer.price)} <small>/ kg</small></p><a className="button button-secondary" aria-label={`Ver oferta: ${offer.title}`} href={offerHref(offer.id)}>Ver oferta</a></div>
              </div>
            </article>)}
            {!loading && !error && filteredOffers.length === 0 && <div className="empty-offers"><Icon name="search" /><h3>{offers.length === 0 ? 'Ainda não há ofertas disponíveis' : 'Nenhuma oferta encontrada'}</h3><p>{offers.length === 0 ? 'Novas ofertas aparecerão aqui quando forem publicadas pelos produtores.' : 'Tente outro produto, tamanho ou região.'}</p></div>}
          </div>
        </section>
      </div>
    </main>
  )
}
