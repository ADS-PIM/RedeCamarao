import type { Offer } from '../data/marketplace'
import { formatPrice } from '../data/marketplace'
import { getOfferSize } from '../data/products'
import { Icon } from './Icon'

export function ProductCard({ offer, onSelect }: { offer: Offer; onSelect: (offer: Offer) => void }) {
  const type = (offer.type ?? '').toLowerCase()
  const image = type.includes('branco') ? 'shrimp-white.jpg'
    : getOfferSize(offer.size) === 'extra-large' ? 'shrimp-premium.jpg'
      : offer.weight > 50 ? 'shrimp-gray.jpg' : 'shrimp-fresh.jpg'

  return (
    <article className="product-card">
      <figure className="product-photo">
        <img src={`/images/${image}`} alt="Foto ilustrativa de camarões; não representa este lote" width="1200" height="675" loading="lazy" decoding="async" />
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
          <button type="button" className="button button-secondary" aria-label={`Ver oferta: ${offer.title}`} onClick={() => onSelect(offer)}>Ver oferta</button>
        </div>
      </div>
    </article>
  )
}
