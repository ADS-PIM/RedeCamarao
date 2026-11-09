import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { ProductCard } from '../components/ProductCard'
import { ProductFilters } from '../components/ProductFilters'
import { useMarketplaceOffers } from '../hooks/useMarketplaceOffers'
import { formatPrice } from '../data/marketplace'
import { emptyProductFilters, filterProductOffers, parseProductPrice, productPagination, productsPerPage, quantityOptions, sizeOptions, sortProductOffers, validateProductPrices } from '../data/products'
import type { ProductFilters as Filters, ProductSort } from '../data/products'
import { brazilianStates } from '../utils/registration'
import './ProductsPage.css'

function removeFilter(filters: Filters, key: keyof Filters, value?: string): Filters {
  if (key === 'states') return { ...filters, states: filters.states.filter(item => item !== value) }
  if (key === 'sizes') return { ...filters, sizes: filters.sizes.filter(item => item !== value) }
  if (key === 'quantities') return { ...filters, quantities: filters.quantities.filter(item => item !== value) }
  return { ...filters, [key]: '' }
}

function scrollToResults(focus = false) {
  const results = document.getElementById('product-results')
  results?.scrollIntoView({ behavior: 'instant', block: 'start' })
  if (focus) results?.focus({ preventScroll: true })
}

export function ProductsPage() {
  const { offers, loading, error, reloadOffers } = useMarketplaceOffers()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Filters>(emptyProductFilters)
  const [filters, setFilters] = useState<Filters>(emptyProductFilters)
  const [priceError, setPriceError] = useState<ReturnType<typeof validateProductPrices>>(null)
  const [sort, setSort] = useState<ProductSort>('recent')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const results = sortProductOffers(filterProductOffers(offers, query, filters), sort)
  const pageCount = Math.max(1, Math.ceil(results.length / productsPerPage))
  const currentPage = Math.min(page, pageCount)
  const visible = results.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
  const chips: { id: string; label: string; remove: () => void }[] = []

  function removeApplied(key: keyof Filters, value?: string) {
    setFilters(current => removeFilter(current, key, value))
    setDraft(current => removeFilter(current, key, value))
    setPage(1)
    setPriceError(null)
  }

  if (query) chips.push({ id: 'query', label: `Busca: ${query}`, remove: () => { setQuery(''); setInput(''); setPage(1) } })
  if (filters.location) chips.push({ id: 'location', label: filters.location, remove: () => removeApplied('location') })
  filters.states.forEach(state => chips.push({ id: `state-${state}`, label: brazilianStates.find(item => item.code === state)?.name ?? state, remove: () => removeApplied('states', state) }))
  sizeOptions.filter(option => filters.sizes.includes(option.id)).forEach(option => chips.push({ id: option.id, label: option.label, remove: () => removeApplied('sizes', option.id) }))
  quantityOptions.filter(option => filters.quantities.includes(option.id)).forEach(option => chips.push({ id: option.id, label: option.label, remove: () => removeApplied('quantities', option.id) }))
  if (filters.minPrice) chips.push({ id: 'minPrice', label: `A partir de ${formatPrice(parseProductPrice(filters.minPrice)!)}`, remove: () => removeApplied('minPrice') })
  if (filters.maxPrice) chips.push({ id: 'maxPrice', label: `Até ${formatPrice(parseProductPrice(filters.maxPrice)!)}`, remove: () => removeApplied('maxPrice') })

  function clearFilters() {
    setInput(''); setQuery(''); setDraft(emptyProductFilters); setFilters(emptyProductFilters); setPriceError(null); setPage(1)
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateProductPrices(draft)
    setPriceError(error)
    if (error) { document.getElementById(`products-${error.field}`)?.focus(); return }
    setFilters({ ...draft, location: draft.location.trim() })
    setPage(1)
    setFiltersOpen(false)
    if (window.matchMedia('(max-width: 1000px)').matches) requestAnimationFrame(() => scrollToResults(true))
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(input.trim())
    setPage(1)
  }

  function changePage(value: number) {
    setPage(value)
    requestAnimationFrame(() => scrollToResults(true))
  }

  const resultLabel = loading ? 'Carregando ofertas...' : error ? 'As ofertas estão temporariamente indisponíveis.'
    : `${results.length} ${results.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}`

  return (
    <main id="main-content" className="products-main">
      <section className="products-intro" aria-labelledby="products-title">
        <div className="container">
          <div className="products-title-row">
            <div><h1 id="products-title">Ofertas de camarão</h1><p className="products-count" role="status">{resultLabel}</p></div>
            <form className="products-search" role="search" aria-label="Buscar produtos" onSubmit={search}>
              <Icon name="search" />
              <input type="search" aria-label="Buscar ofertas, tamanho ou região" placeholder="Buscar ofertas, tamanho ou região..." value={input} onChange={event => setInput(event.target.value)} />
              <button type="submit" className="button button-primary">Buscar</button>
            </form>
          </div>
        </div>
      </section>

      <div className="container products-layout">
        <button type="button" className="button button-secondary filter-toggle" aria-controls="product-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}>
          <Icon name={filtersOpen ? 'close' : 'filters'} />{filtersOpen ? 'Fechar filtros' : 'Filtrar ofertas'}
        </button>
        <aside className={`products-sidebar${filtersOpen ? ' is-open' : ''}`} aria-label="Filtros de produtos">
          <ProductFilters offers={offers} value={draft} unavailable={loading || Boolean(error)} loading={loading} priceError={priceError}
            onChange={value => { setDraft(value); setPriceError(null) }} onApply={applyFilters} onClear={clearFilters} />
        </aside>
        <section id="product-results" className="product-results" aria-label="Ofertas disponíveis" tabIndex={-1}>
          <div className="products-toolbar">
            <div className="filter-chips" aria-label="Filtros aplicados">
              {chips.map(chip => <button type="button" className="filter-chip" key={chip.id} aria-label={`Remover filtro: ${chip.label}`} onClick={chip.remove}>{chip.label}<Icon name="close" /></button>)}
            </div>
            <div className="products-sort"><label htmlFor="products-sort">Ordenar por</label><select id="products-sort" value={sort} onChange={event => { setSort(event.target.value as ProductSort); setPage(1) }}>
              <option value="recent">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="quantity-desc">Maior quantidade</option>
            </select></div>
          </div>
          <div className="products-grid" aria-busy={loading}>
            {loading && <div className="products-state products-loading" role="status"><span className="products-spinner" aria-hidden="true" /><h2>Carregando ofertas...</h2><p>Estamos buscando as ofertas disponíveis para você.</p></div>}
            {!loading && error && <div className="products-state" role="alert"><Icon name="info" /><h2>Não foi possível carregar as ofertas</h2><p>{error}</p><button type="button" className="button button-secondary" onClick={reloadOffers}>Tentar novamente</button></div>}
            {!loading && !error && visible.map(offer => <ProductCard key={offer.id} offer={offer} />)}
            {!loading && !error && !results.length && <div className="products-state"><Icon name="search" /><h2>{offers.length ? 'Nenhuma oferta encontrada' : 'Ainda não há ofertas disponíveis'}</h2><p>{offers.length ? 'Tente outros filtros, uma nova região ou uma faixa de preço diferente.' : 'As ofertas aparecerão aqui quando forem publicadas pelos produtores.'}</p>{chips.length > 0 && <button type="button" className="button button-secondary" onClick={clearFilters}>Limpar filtros</button>}</div>}
          </div>
          {!loading && !error && results.length > 0 && <>
            <p className="products-page-summary" role="status">Exibindo {(currentPage - 1) * productsPerPage + 1}–{Math.min(currentPage * productsPerPage, results.length)} de {results.length} ofertas</p>
            {pageCount > 1 && <nav className="products-pagination" aria-label="Paginação de produtos">
              <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Anterior</button>
              {productPagination(currentPage, pageCount).map((item, index) => item === 'ellipsis' ? <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
                : <button type="button" key={item} aria-label={`Página ${item}`} aria-current={currentPage === item ? 'page' : undefined} onClick={() => changePage(item)}>{item}</button>)}
              <button type="button" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>Próxima</button>
            </nav>}
          </>}
        </section>
      </div>
    </main>
  )
}
