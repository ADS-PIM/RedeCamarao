import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { ProductCard } from '../components/ProductCard'
import { Pagination } from '../components/Pagination'
import { ProductFilters } from '../components/ProductFilters'
import { useMarketplaceOffers } from '../hooks/useMarketplaceOffers'
import { readCatalogEntry, matchesShelf, shelfTitles } from '../data/showcase'
import { formatPrice } from '../data/marketplace'
import { emptyProductFilters, filterProductOffers, parseProductPrice, productsPerPage, quantityOptions, sizeOptions, sortProductOffers, validateProductPrices } from '../data/products'
import type { ProductFilters as Filters, ProductSort } from '../data/products'
import { brazilianStates } from '../utils/registration'
import { shrimpTypeOptions, validateCatalogQuantity } from '../data/catalogFilters'
import './ProductsPage.css'

function removeFilter(filters: Filters, key: keyof Filters, value?: string): Filters {
  if (key === 'types') return { ...filters, types: filters.types.filter(item => item !== value) }
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
  const { offers, loadedAt, loading, error, reloadOffers } = useMarketplaceOffers()
  const [entry] = useState(() => readCatalogEntry(window.location.search))
  const [shelf, setShelf] = useState(entry.shelf)
  const [input, setInput] = useState(entry.query)
  const [query, setQuery] = useState(entry.query)
  const [draft, setDraft] = useState<Filters>({ ...emptyProductFilters, ...entry.selection })
  const [filters, setFilters] = useState<Filters>(draft)
  const [priceError, setPriceError] = useState<ReturnType<typeof validateProductPrices>>(null)
  const [sort, setSort] = useState<ProductSort>('recent')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const sectionOffers = shelf === 'featured' ? offers : offers.filter(offer => matchesShelf(offer, shelf, loadedAt))
  const results = sortProductOffers(filterProductOffers(sectionOffers, query, filters), sort)
  const pageCount = Math.max(1, Math.ceil(results.length / productsPerPage))
  const currentPage = Math.min(page, pageCount)
  const visible = results.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
  const chips: { id: string; label: string; remove: () => void }[] = []
  if (shelf !== 'featured') chips.push({ id: 'section', label: shelfTitles[shelf], remove: () => { setShelf('featured'); setPage(1) } })

  function removeApplied(key: keyof Filters, value?: string) {
    setFilters(current => removeFilter(current, key, value))
    setDraft(current => removeFilter(current, key, value))
    setPage(1)
    setPriceError(null)
  }

  if (query) chips.push({ id: 'query', label: `Busca: ${query}`, remove: () => { setQuery(''); setInput(''); setPage(1) } })
  if (filters.location) chips.push({ id: 'location', label: filters.location, remove: () => removeApplied('location') })
  shrimpTypeOptions.filter(option => filters.types.includes(option.id)).forEach(option => chips.push({ id: option.id, label: option.label, remove: () => removeApplied('types', option.id) }))
  for (const field of ['minQuantity', 'maxQuantity'] as const) {
    if (filters[field]) chips.push({ id: field, label: `${field === 'minQuantity' ? 'Lote a partir de' : 'Lote até'} ${filters[field]} ${filters.quantityUnit}`, remove: () => removeApplied(field) })
  }
  filters.states.forEach(state => chips.push({ id: `state-${state}`, label: brazilianStates.find(item => item.code === state)?.name ?? state, remove: () => removeApplied('states', state) }))
  sizeOptions.filter(option => filters.sizes.includes(option.id)).forEach(option => chips.push({ id: option.id, label: option.label, remove: () => removeApplied('sizes', option.id) }))
  quantityOptions.filter(option => filters.quantities.includes(option.id)).forEach(option => chips.push({ id: option.id, label: option.label, remove: () => removeApplied('quantities', option.id) }))
  if (filters.minPrice) chips.push({ id: 'minPrice', label: `A partir de ${formatPrice(parseProductPrice(filters.minPrice)!)}`, remove: () => removeApplied('minPrice') })
  if (filters.maxPrice) chips.push({ id: 'maxPrice', label: `Até ${formatPrice(parseProductPrice(filters.maxPrice)!)}`, remove: () => removeApplied('maxPrice') })

  function clearFilters() {
    setShelf('featured')
    setInput(''); setQuery(''); setDraft(emptyProductFilters); setFilters(emptyProductFilters); setPriceError(null); setPage(1)
  }

  function changeFilters(next: Filters) {
    const priceError = validateProductPrices(next)
    const quantityError = validateCatalogQuantity(next)
    setDraft(next)
    setPriceError(priceError)

    const nextApplied = { ...next, location: next.location.trim() }
    if (priceError) {
      nextApplied.minPrice = filters.minPrice
      nextApplied.maxPrice = filters.maxPrice
    }
    if (quantityError) {
      nextApplied.minQuantity = filters.minQuantity
      nextApplied.maxQuantity = filters.maxQuantity
      nextApplied.quantityUnit = filters.quantityUnit
    }
    setFilters(nextApplied)
    setPage(1)
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
          <ProductFilters offers={sectionOffers} query={query} applied={filters} value={draft} unavailable={loading || Boolean(error)} loading={loading} priceError={priceError}
            onChange={changeFilters} onClear={clearFilters} />
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
            <Pagination currentPage={currentPage} totalPages={pageCount} onChange={changePage} label="Paginação de produtos" />
          </>}
        </section>
      </div>
    </main>
  )
}
