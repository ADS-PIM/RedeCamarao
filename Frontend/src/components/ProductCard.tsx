import type { Offer } from '../data/marketplace'
import { formatPrice } from '../data/marketplace'
import { offerHref, offerIllustration } from '../data/offerDetail'
import { Icon } from './Icon'

export function ProductCard({ offer, producerName, photo, preview = false, available = true }: { offer: Offer; producerName?: string; photo?: { imageUrl: string; description: string }; preview?: boolean; available?: boolean }) {
  return (
    <article className="product-card">
      <figure className="product-photo">
        <img src={photo?.imageUrl ?? offerIllustration(offer)} alt={photo?.description || (photo ? 'Foto da oferta' : 'Foto ilustrativa de camarões; não representa este lote')} width="1200" height="675" loading="lazy" decoding="async" />
        {!photo && <figcaption>Foto ilustrativa</figcaption>}
      </figure>
      <div className="product-card-body">
        <div className="product-labels">
          <span>{offer.type || 'Camarão'}</span>
          <span className={available ? 'product-available' : 'product-unavailable'}><span aria-hidden="true">●</span> {available ? 'Disponível' : 'Pausada'}</span>
        </div>
        <h3>{offer.title}</h3>
        <p className="product-description">{producerName ?? offer.description}</p>
        <div className="product-specs"><span>{offer.size} · {offer.weight} kg</span><span><Icon name="pin" />{offer.location}</span></div>
        <div className="product-card-bottom">
          <p className="product-price">{formatPrice(offer.price)} <small>/ kg</small></p>
          {preview ? <span className="button button-secondary">Prévia</span> : <a className="button button-secondary" aria-label={`Ver oferta: ${offer.title}`} href={offerHref(offer.id)}>Ver oferta</a>}
        </div>
      </div>
    </article>
  )
}
