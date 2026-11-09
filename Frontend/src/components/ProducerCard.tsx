import type { Producer } from '../data/producers'
import { producerHref, producerIllustration, producerLocation } from '../data/producers'
import { Icon } from './Icon'

export function ProducerCard({ producer }: { producer: Producer }) {
  return (
    <article className="producer-card">
      <figure className="producer-photo">
        <img src={producerIllustration(producer.id)} alt="Imagem ilustrativa de viveiros de camarão; não representa esta fazenda" width="1200" height="600" loading="lazy" decoding="async"
          onError={event => { if (!event.currentTarget.src.endsWith('/images/shrimp-farm.jpg')) event.currentTarget.src = '/images/shrimp-farm.jpg' }} />
        <figcaption>Imagem ilustrativa</figcaption>
      </figure>
      <div className="producer-card-body">
        <h3>{producer.name}</h3>
        <p className="producer-location"><Icon name="pin" /><span>{producerLocation(producer.location).label}</span></p>
        <p className="producer-description">{producer.description || 'Este produtor ainda não adicionou uma apresentação.'}</p>
        <div className="producer-card-bottom">
          <p className={`producer-offers${producer.activeOfferCount === 0 ? ' is-empty' : ''}`}>{producer.activeOfferCount} {producer.activeOfferCount === 1 ? 'oferta ativa' : 'ofertas ativas'}</p>
          <a className="button button-secondary" href={producerHref(producer.id)} aria-label={`Ver produtor: ${producer.name}`}>Ver produtor<Icon name="arrow" /></a>
        </div>
      </div>
    </article>
  )
}
