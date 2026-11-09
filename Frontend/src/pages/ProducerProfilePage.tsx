import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { useProducerProfile } from '../hooks/useProducerProfile'
import { producerIllustration, producerLocation } from '../data/producers'
import { productsPerPage } from '../data/products'
import './ProducersPage.css'

export function ProducerProfilePage({ producerId }: { producerId: string }) {
  const { profile, loading, error, reloadProfile } = useProducerProfile(producerId)
  const [page, setPage] = useState(1)
  useEffect(() => {
    document.title = `${loading ? 'Produtor' : error ? 'Produtor indisponível' : profile?.producer.name ?? 'Produtor não encontrado'} | RedeCamarão`
  }, [profile, loading, error])

  if (loading || error || !profile) return (
    <main id="main-content" className="producer-profile-main"><div className="container producer-profile-container"><div className="producers-state" role={error ? 'alert' : 'status'}>
      <Icon name={loading ? 'waves' : 'info'} /><h1>{loading ? 'Carregando produtor...' : error ? 'Não foi possível carregar este produtor' : 'Produtor não encontrado'}</h1>
      <p>{loading ? 'Estamos buscando o perfil e suas ofertas disponíveis.' : error ?? 'Este perfil não está disponível. Explore outros produtores da rede.'}</p>
      {error && <button type="button" className="button button-secondary" onClick={reloadProfile}>Tentar novamente</button>}
      {!loading && <a href="/produtores" className="button button-primary">Explorar produtores</a>}
    </div></div></main>
  )

  const { producer, offers } = profile
  const totalPages = Math.max(1, Math.ceil(offers.length / productsPerPage))
  const currentPage = Math.min(page, totalPages)
  const visible = offers.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
  function changePage(next: number) {
    setPage(next)
    requestAnimationFrame(() => { const section = document.getElementById('producer-profile-offers'); section?.scrollIntoView({ behavior: 'instant', block: 'start' }); section?.focus({ preventScroll: true }) })
  }

  return (
    <main id="main-content" className="producer-profile-main">
      <div className="container producer-profile-container">
        <section className="producer-profile" aria-labelledby="producer-profile-title">
          <figure className="producer-profile-photo"><img src={producerIllustration(producer.id)} alt="Imagem ilustrativa de viveiros; não representa esta fazenda" width="1200" height="600" decoding="async"
            onError={event => { if (!event.currentTarget.src.endsWith('/images/shrimp-farm.jpg')) event.currentTarget.src = '/images/shrimp-farm.jpg' }} /><figcaption>Imagem ilustrativa</figcaption></figure>
          <div className="producer-profile-body">
            <p className="producer-profile-eyebrow">Produtor da RedeCamarão</p><h1 id="producer-profile-title">{producer.name}</h1>
            <p className="producer-location"><Icon name="pin" /><span>{producerLocation(producer.location).label}</span></p>
            <p className="producer-profile-description">{producer.description || 'Este produtor ainda não adicionou uma apresentação.'}</p>
            <dl className="producer-profile-facts"><div><dt>Ofertas ativas</dt><dd>{producer.activeOfferCount}</dd></div>{producer.businessHours && <div><dt>Horário de atendimento</dt><dd>{producer.businessHours}</dd></div>}</dl>
            <p className="producer-profile-contact">O contato pelo WhatsApp estará disponível em breve.</p>
          </div>
        </section>
        <section id="producer-profile-offers" className="producer-profile-offers" aria-labelledby="producer-offers-title" tabIndex={-1}>
          <div className="producers-toolbar"><div><h2 id="producer-offers-title">Ofertas deste produtor</h2><p className="producers-results-description">{offers.length} {offers.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'}</p></div><a className="button button-secondary" href="/produtos">Ver todos os produtos<Icon name="arrow" /></a></div>
          {offers.length ? <><div className="producer-profile-offer-grid">{visible.map(offer => <ProductCard key={offer.id} offer={offer} />)}</div><Pagination currentPage={currentPage} totalPages={totalPages} onChange={changePage} label="Paginação de ofertas do produtor" /></>
            : <div className="producers-state"><Icon name="box" /><h2>Sem ofertas ativas no momento</h2><p>Novas ofertas deste produtor aparecerão aqui quando estiverem disponíveis.</p><a className="button button-secondary" href="/produtos">Explorar outras ofertas</a></div>}
        </section>
      </div>
    </main>
  )
}
