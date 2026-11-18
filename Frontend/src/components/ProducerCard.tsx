import type { Producer } from '../data/producers'
import { producerHref, producerLocation } from '../data/producers'
import { Icon } from './Icon'
import { Avatar } from './Avatar'

export function ProducerCard({ producer }: { producer: Producer }) {
  return (
    <article className="producer-card">
      <div className="producer-card-body">
        <div className="producer-card-identity">{producer.profilePicture && <Avatar src={producer.profilePicture} className="producer-card-avatar" />}<h3>{producer.name}</h3></div>
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
