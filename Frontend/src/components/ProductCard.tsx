import type { Offer } from '../data/marketplace'
import { formatPrice } from '../data/marketplace'
import { offerHref, offerIllustration } from '../data/offerDetail'
import { Icon } from './Icon'

export function ProductCard({ offer }: { offer: Offer }) {
  return (
    <article className="product-card">
      <figure className="product-photo">
        <img src={offerIllustration(offer)} alt="Foto ilustrativa de camarões; não representa este lote" width="1200" height="675" loading="lazy" decoding="async" />
        <figcaption>Foto ilustrativa</figcaption>
      </figure>
      <div className="product-card-body">
        <div className="product-labels">
          <span>{offer.type || 'Camarão'}</span>
          <span className="product-available"><span aria-hidden="true">●</span> Disponível</span>
        </div>
        <h3>{offer.title}</h3>
        <p className="product-description">{offer.description}</p>
        <div className="product-specs"><span>{offer.size} · {offer.weight} kg</span><span><Icon name="pin" />{offer.location}</span></div>
        <div className="product-card-bottom">
          <p className="product-price">{formatPrice(offer.price)} <small>/ kg</small></p>
          <a className="button button-secondary" aria-label={`Ver oferta: ${offer.title}`} href={offerHref(offer.id)}>Ver oferta</a>
        </div>
      </div>
    </article>
  )
}
