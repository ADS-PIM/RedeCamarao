import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { ProducerCard } from '../components/ProducerCard'
import { useProducers } from '../hooks/useProducers'
import { emptyProducerFilters, filterProducers, producerCities, producersPerPage, sortProducers } from '../data/producers'
import type { ProducerFilters, ProducerSort } from '../data/producers'
import { brazilianStates } from '../utils/registration'
import './ProducersPage.css'

function revealResults() {
  const results = document.getElementById('producers-results')
  results?.scrollIntoView({ behavior: 'instant', block: 'start' })
  results?.focus({ preventScroll: true })
}

export function ProducersPage() {
  const { producers, loading, error, reloadProducers } = useProducers()
  const [draft, setDraft] = useState<ProducerFilters>(emptyProducerFilters)
  const [filters, setFilters] = useState<ProducerFilters>(emptyProducerFilters)
  const [sort, setSort] = useState<ProducerSort>('relevant')
  const [page, setPage] = useState(1)
  const cities = producerCities(producers, draft.state)
  const results = sortProducers(filterProducers(producers, filters), sort, filters.name)
  const totalPages = Math.max(1, Math.ceil(results.length / producersPerPage))
  const currentPage = Math.min(page, totalPages)
  const visible = results.slice((currentPage - 1) * producersPerPage, currentPage * producersPerPage)
  const filtering = Boolean(filters.name || filters.state || filters.city)

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFilters({ ...draft, name: draft.name.trim() })
    setPage(1)
    requestAnimationFrame(revealResults)
  }

  function clearSearch() { setDraft(emptyProducerFilters); setFilters(emptyProducerFilters); setPage(1) }
  function changePage(next: number) { setPage(next); requestAnimationFrame(revealResults) }
  const title = loading ? 'Carregando produtores...' : error ? 'Produtores indisponíveis no momento'
    : `${results.length} ${results.length === 1 ? 'produtor encontrado' : 'produtores encontrados'}`

  return (
    <main id="main-content" className="producers-main">
      <section className="producers-intro" aria-labelledby="producers-title">
        <div className="container">
          <h1 id="producers-title">Encontre produtores da RedeCamarão</h1>
          <p className="producers-intro-description">Conheça as fazendas, explore suas ofertas e negocie diretamente com quem produz.</p>
          <form className="producers-search" role="search" aria-label="Buscar produtores" onSubmit={search}>
            <div className="producers-search-field">
              <label htmlFor="producer-name">Buscar produtor</label>
              <div className="producers-search-input"><Icon name="search" /><input id="producer-name" type="search" placeholder="Nome da fazenda ou do produtor" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} /></div>
            </div>
            <div className="producers-search-field">
              <label htmlFor="producer-state">Estado</label>
              <select id="producer-state" className="producers-search-select" value={draft.state} onChange={event => setDraft(current => ({ ...current, state: event.target.value, city: '' }))}>
                <option value="">Todos os estados</option>{brazilianStates.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}
              </select>
            </div>
            <div className="producers-search-field">
              <label htmlFor="producer-city">Cidade</label>
              <select id="producer-city" className="producers-search-select" value={draft.city} disabled={loading || cities.length === 0} onChange={event => setDraft(current => ({ ...current, city: event.target.value }))}>
                <option value="">Todas as cidades</option>{cities.map(city => <option key={city.value} value={city.value}>{city.label}</option>)}
              </select>
            </div>
            <button type="submit" className="button button-primary">Buscar produtores</button>
          </form>
        </div>
      </section>

      <section id="producers-results" className="container producers-results" aria-labelledby="producers-results-title" tabIndex={-1}>
        <div className="producers-toolbar">
          <div><h2 id="producers-results-title" aria-live="polite" aria-atomic="true">{title}</h2><p className="producers-results-description">Acesse o perfil de cada fazenda para conhecer suas ofertas.</p>{filtering && <button type="button" className="producers-clear" onClick={clearSearch}>Limpar busca</button>}</div>
          <div className="producers-sort"><label htmlFor="producers-sort">Ordenar por</label><select id="producers-sort" value={sort} onChange={event => { setSort(event.target.value as ProducerSort); setPage(1) }}>
            <option value="relevant">Mais relevantes</option><option value="name-asc">Nome: A a Z</option><option value="name-desc">Nome: Z a A</option><option value="offers-desc">Mais ofertas ativas</option>
          </select></div>
        </div>
        <div className="producers-grid" aria-busy={loading}>
          {loading && <div className="producers-state" role="status"><span className="producers-spinner" aria-hidden="true" /><h2>Carregando produtores...</h2><p>Estamos buscando os produtores da rede para você.</p></div>}
          {!loading && error && <div className="producers-state" role="alert"><Icon name="info" /><h2>Não foi possível carregar os produtores</h2><p>{error}</p><button type="button" className="button button-secondary" onClick={reloadProducers}>Tentar novamente</button></div>}
          {!loading && !error && visible.map(producer => <ProducerCard key={producer.id} producer={producer} />)}
          {!loading && !error && results.length === 0 && <div className="producers-state"><Icon name="search" /><h2>{producers.length ? 'Nenhum produtor encontrado' : 'Ainda não há produtores cadastrados'}</h2><p>{producers.length ? 'Tente outro nome, estado ou cidade para encontrar um produtor.' : 'Os produtores aparecerão aqui quando se cadastrarem na plataforma.'}</p></div>}
        </div>
        {!loading && !error && results.length > 0 && <div className="producers-pagination-row">
          <p className="producers-page-summary" role="status">Mostrando {(currentPage - 1) * producersPerPage + 1}–{Math.min(currentPage * producersPerPage, results.length)} de {results.length} produtores</p>
          <Pagination currentPage={currentPage} totalPages={totalPages} onChange={changePage} label="Paginação de produtores" />
        </div>}
      </section>
    </main>
  )
}
