import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { QuantityRangeFields } from '../components/QuantityRangeFields'
import { MarketplaceOfferCard } from '../components/MarketplaceOfferCard'
import { filterOffers } from '../data/marketplace'
import { catalogHref, filteredShelves, shelfTitles, type Shelf } from '../data/showcase'
import { emptyCatalogSelection, shrimpTypeOptions, validateCatalogQuantity } from '../data/catalogFilters'
import type { CatalogSelection } from '../data/catalogFilters'
import { sizeOptions } from '../data/products'
import { useMarketplaceOffers } from '../hooks/useMarketplaceOffers'
import { brazilianStates } from '../utils/registration'
import './MarketplacePage.css'

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

function scrollToOffers() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('ofertas')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
}

const shelfOrder: Shelf[] = ['featured', 'wholesale', 'regional']

export function MarketplacePage({ profileState = '' }: { profileState?: string }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<CatalogSelection>(emptyCatalogSelection)
  const [invalidQuantity, setInvalidQuantity] = useState<Pick<CatalogSelection, 'minQuantity' | 'maxQuantity' | 'quantityUnit'> | null>(null)
  const filtering = Boolean(query.trim() || filters.types.length || filters.sizes.length || filters.states.length || filters.minQuantity || filters.maxQuantity)
  const { offers, loadedAt, loading, error, reloadOffers } = useMarketplaceOffers(filtering ? 'popular' : 'showcase', filtering ? '' : profileState)
  const filteredOffers = filterOffers(offers, query, filters)
  const chips = [
    ...(query ? [{ id: 'query', label: `Busca: ${query}`, remove: () => { setInput(''); setQuery('') } }] : []),
    ...shrimpTypeOptions.filter(item => filters.types.includes(item.id)).map(item => ({ id: item.id, label: item.label, remove: () => setFilters(current => ({ ...current, types: toggle(current.types, item.id) })) })),
    ...sizeOptions.filter(item => filters.sizes.includes(item.id)).map(item => ({ id: item.id, label: item.label, remove: () => setFilters(current => ({ ...current, sizes: toggle(current.sizes, item.id) })) })),
    ...brazilianStates.filter(item => filters.states.includes(item.code)).map(item => ({ id: item.code, label: item.name, remove: () => setFilters(current => ({ ...current, states: toggle(current.states, item.code) })) })),
    ...(['minQuantity', 'maxQuantity'] as const).filter(field => filters[field]).map(field => ({ id: field, label: `${field === 'minQuantity' ? 'Lote a partir de' : 'Lote até'} ${filters[field]} ${filters.quantityUnit}`, remove: () => { setInvalidQuantity(null); setFilters(current => ({ ...current, [field]: '' })) } })),
  ]
  const regionalStates = filters.states.length ? filters.states : profileState ? [profileState] : []
  const shelves = filtering ? filteredShelves(filteredOffers, regionalStates, loadedAt) : {
    featured: offers.filter(offer => offer.shelf === 'featured'),
    wholesale: offers.filter(offer => offer.shelf === 'wholesale'),
    regional: offers.filter(offer => offer.shelf === 'regional'),
  }
  const descriptions = {
    featured: filtering ? `${filteredOffers.length} ${filteredOffers.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}` : 'Destaques por consultas de contato e visitas.',
    wholesale: 'Lotes com mais de 500 kg disponíveis.',
    regional: `Últimas 24 horas · ${regionalStates.length ? regionalStates.join(', ') : 'Todos os estados'}`,
  }
  const emptyMessages = {
    featured: filtering ? 'Nenhuma oferta corresponde aos filtros selecionados.' : 'Ainda não há ofertas disponíveis.',
    wholesale: 'Nenhum outro lote acima de 500 kg disponível.',
    regional: 'Nenhum outro lote publicado nas últimas 24 horas nesta seleção.',
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(input.trim())
    scrollToOffers()
  }

  function changeQuantity(next: CatalogSelection) {
    const { minQuantity, maxQuantity, quantityUnit } = next
    const quantity = { minQuantity, maxQuantity, quantityUnit }
    if (validateCatalogQuantity(next)) {
      setInvalidQuantity(quantity)
      return
    }
    setInvalidQuantity(null)
    setFilters(current => ({ ...current, ...quantity }))
  }

  function clearFilters() { setInput(''); setQuery(''); setInvalidQuantity(null); setFilters(emptyCatalogSelection) }

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
            {(filtering || invalidQuantity) && <button className="market-clear-filters" type="button" onClick={clearFilters}>Limpar filtros<Icon name="close" /></button>}
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
              <QuantityRangeFields idPrefix="market-lot" value={{ ...filters, ...invalidQuantity }} onChange={changeQuantity} />
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

        <div id="ofertas" className="market-shelves" aria-busy={loading}>
          {loading ? <div className="offers-loading" role="status">Carregando ofertas...</div>
            : error ? <div className="empty-offers" role="alert"><Icon name="info" /><h3>Não foi possível carregar as ofertas</h3><p>{error}</p><button className="button button-secondary" onClick={reloadOffers}>Tentar novamente</button></div>
              : shelfOrder.map(shelf => <section key={shelf} className="offers-section" aria-labelledby={`shelf-${shelf}`}>
                <div className="section-heading">
                  <div><h2 id={`shelf-${shelf}`}>{shelf === 'featured' && filtering ? 'Ofertas encontradas' : shelfTitles[shelf]}</h2>
                    <p className="section-description">{descriptions[shelf]}</p></div>
                  <a className="button button-secondary view-all" aria-label={`Ver todas: ${shelfTitles[shelf]}`}
                    href={catalogHref(shelf, shelf === 'regional' ? { ...filters, states: regionalStates } : filters, query)}>Ver todas <Icon name="arrow" /></a>
                </div>
                {shelves[shelf].length ? <div className="offer-grid">
                  {shelves[shelf].map(offer => <MarketplaceOfferCard key={offer.id} offer={offer} />)}
                </div> : <p className="market-shelf-empty">{emptyMessages[shelf]}</p>}
              </section>)}
          <footer className="market-catalog-link"><a className="button button-secondary" href="/produtos">Explorar catálogo completo de ofertas <Icon name="arrow" /></a></footer>
        </div>
      </div>
    </main>
  )
}
