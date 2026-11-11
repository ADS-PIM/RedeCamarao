import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { useProducerProfile } from '../hooks/useProducerProfile'
import { filterProducerOffers, producerIllustration, producerLocation, producerWhatsAppHref } from '../data/producers'
import type { ProducerOfferFilter } from '../data/producers'
import { productsPerPage } from '../data/products'
import './ProducersPage.css'

export function ProducerProfilePage({ producerId }: { producerId: string }) {
  const { profile, loading, error, reloadProfile } = useProducerProfile(producerId)
  const [page, setPage] = useState(1)
  const [offerFilter, setOfferFilter] = useState<ProducerOfferFilter>('all')
  useEffect(() => {
    document.title = `${loading ? 'Produtor' : error ? 'Produtor indisponível' : profile?.producer.name ?? 'Produtor não encontrado'} | RedeCamarão`
  }, [profile, loading, error])

  if (loading || error || !profile) {
    const missing = !loading && !error && !profile
    return (
      <main id="main-content" className="producer-profile-main">
        <div className="container producer-profile-container">
          <section className="producers-state" role={error ? 'alert' : 'status'}>
            <Icon name={loading ? 'waves' : 'info'} />
            <h1>{loading ? 'Carregando produtor...' : error ? 'Não foi possível carregar este produtor' : 'Produtor não encontrado'}</h1>
            <p>{loading ? 'Estamos buscando o perfil e suas ofertas disponíveis.' : error ?? 'Este perfil não está disponível ou foi removido.'}</p>
            {error && <button type="button" className="button button-secondary" onClick={reloadProfile}>Tentar novamente</button>}
            {missing && <a href="/produtores" className="button button-primary">Explorar produtores</a>}
            {!loading && !missing && <a href="/produtores" className="producer-profile-back">Voltar para produtores</a>}
          </section>
        </div>
      </main>
    )
  }

  const { producer, offers } = profile
  const location = producerLocation(producer.location).label
  const whatsappHref = producerWhatsAppHref(producer.phone)
  const grayCount = filterProducerOffers(offers, 'gray').length
  const whiteCount = filterProducerOffers(offers, 'white').length
  const otherCount = filterProducerOffers(offers, 'other').length
  const filters: { id: ProducerOfferFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: offers.length },
    { id: 'gray', label: 'Camarão cinza', count: grayCount },
    { id: 'white', label: 'Camarão branco', count: whiteCount },
    { id: 'other', label: 'Outras ofertas', count: otherCount },
  ]
  const availableFilters = filters.filter((filter, index) => index === 0 || filter.count > 0)
  const filteredOffers = filterProducerOffers(offers, offerFilter)
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / productsPerPage))
  const currentPage = Math.min(page, totalPages)
  const visible = filteredOffers.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
  function changePage(next: number) {
    setPage(next)
    requestAnimationFrame(() => { const section = document.getElementById('producer-profile-offers'); section?.scrollIntoView({ behavior: 'instant', block: 'start' }); section?.focus({ preventScroll: true }) })
  }
  function changeFilter(filter: ProducerOfferFilter) {
    setOfferFilter(filter)
    setPage(1)
  }

  return (
    <main id="main-content" className="producer-profile-main">
      <section className="producer-profile-banner" aria-label={`Imagem ilustrativa da fazenda ${producer.name}`}>
        <img src={producerIllustration(producer.id)} alt="" width="1600" height="600" decoding="async"
          onError={event => { if (!event.currentTarget.src.endsWith('/images/shrimp-farm.jpg')) event.currentTarget.src = '/images/shrimp-farm.jpg' }} />
        <div className="container producer-profile-banner-content">
          <nav aria-label="Trilha de navegação"><a href="/">Início</a><span aria-hidden="true">/</span><a href="/produtores">Produtores</a><span aria-hidden="true">/</span><span aria-current="page">{producer.name}</span></nav>
          <span className="producer-profile-image-note">Imagem ilustrativa</span>
        </div>
      </section>

      <section className="producer-profile-heading" aria-labelledby="producer-profile-title">
        <div className="container producer-profile-heading-inner">
          <span className="producer-profile-avatar"><Icon name="waves" /></span>
          <div className="producer-profile-heading-copy">
            <p className="producer-profile-eyebrow">Produtor da RedeCamarão</p>
            <h1 id="producer-profile-title">{producer.name}</h1>
            <p className="producer-location"><Icon name="pin" /><span>{location}</span></p>
          </div>
          <div className="producer-profile-actions" aria-label="Opções de contato">
            {whatsappHref
              ? <a className="button producer-whatsapp-button" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp, abre em nova aba"><Icon name="chat" />WhatsApp</a>
              : <button type="button" className="button button-secondary" disabled aria-describedby="producer-contact-note"><Icon name="chat" />WhatsApp</button>}
          </div>
        </div>
      </section>

      <div className="container producer-profile-container">
        <aside className="producer-profile-sidebar" aria-label="Informações do produtor">
          <section className="producer-profile-card" aria-labelledby="producer-about-title">
            <h2 id="producer-about-title">Sobre o produtor</h2>
            <p className="producer-profile-description">{producer.description || 'Este produtor ainda não adicionou uma apresentação.'}</p>
            <dl className="producer-profile-facts">
              <div><dt>Ofertas ativas</dt><dd>{producer.activeOfferCount}</dd></div>
              <div><dt>Localização</dt><dd>{location}</dd></div>
            </dl>
          </section>
          <section className="producer-profile-card producer-contact-card" aria-labelledby="producer-contact-title">
            <h2 id="producer-contact-title">Contato</h2>
            <dl className="producer-contact-details">
              <div><dt>Atendimento</dt><dd>{producer.businessHours || 'Horário não informado'}</dd></div>
              <div><dt>Telefone</dt><dd>{producer.phone || 'Telefone não informado'}</dd></div>
            </dl>
            <p id="producer-contact-note" className="producer-profile-contact"><Icon name="info" />{whatsappHref ? 'Você será direcionado ao WhatsApp para falar diretamente com este produtor. A negociação e o pagamento acontecem fora da plataforma.' : 'Este produtor não informou um telefone válido para contato pelo WhatsApp.'}</p>
          </section>
        </aside>

        <section id="producer-profile-offers" className="producer-profile-offers" aria-labelledby="producer-offers-title" tabIndex={-1}>
          <div className="producers-toolbar">
            <div><h2 id="producer-offers-title">Ofertas ativas</h2><p className="producers-results-description">{offers.length} {offers.length === 1 ? 'oferta publicada por este produtor' : 'ofertas publicadas por este produtor'}{filteredOffers.length !== offers.length && <span role="status" aria-live="polite"> Exibindo {filteredOffers.length}.</span>}</p></div>
            <a className="button button-secondary" href="/produtos">Ver todos os produtos<Icon name="arrow" /></a>
          </div>
          {offers.length > 0 && <div className="producer-offer-filters" role="group" aria-label="Filtrar ofertas por tipo">
            {availableFilters.map(filter => <button key={filter.id} type="button" className="producer-offer-filter" aria-pressed={offerFilter === filter.id} onClick={() => changeFilter(filter.id)}>{filter.label} ({filter.count})</button>)}
          </div>}
          {filteredOffers.length > 0
            ? <><div className="producer-profile-offer-grid">{visible.map(offer => <ProductCard key={offer.id} offer={offer} />)}</div><Pagination currentPage={currentPage} totalPages={totalPages} onChange={changePage} label="Paginação de ofertas do produtor" /></>
            : <div className="producers-state">
              <Icon name="box" />
              <h2>{offers.length ? 'Nenhuma oferta nesta categoria' : 'Sem ofertas ativas no momento'}</h2>
              <p>{offers.length ? 'Escolha outra categoria para ver as ofertas deste produtor.' : 'Novas ofertas deste produtor aparecerão aqui quando estiverem disponíveis.'}</p>
              {offers.length ? <button type="button" className="button button-secondary" onClick={() => changeFilter('all')}>Ver todas as ofertas</button> : <a className="button button-secondary" href="/produtos">Explorar outras ofertas</a>}
            </div>}
        </section>
      </div>
    </main>
  )
}
