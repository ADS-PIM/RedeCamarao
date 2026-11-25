import { useState } from 'react'
import { Icon } from './Icon'
import { offerHref } from '../data/offerDetail'
import { formatPrice, type Offer } from '../data/marketplace'
import { formatQuantity } from '../data/offerUnits'

export function MarketplaceOfferCard({ offer }: { offer: Offer }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  return <article className="offer-card">
    <div className="offer-content">
      <div className="offer-card-heading">
        <div className="offer-thumb">
          {offer.coverPhoto && offer.coverPhoto !== failedPhoto
            ? <img src={offer.coverPhoto} alt={`Foto do lote ${offer.title}`} width="60" height="60" loading="lazy" decoding="async" onError={() => setFailedPhoto(offer.coverPhoto ?? null)} />
            : <Icon name="shrimp" />}
        </div>
        <div className="offer-card-identity"><span className="offer-type-label">{offer.type || 'Camarão'}</span><h3>{offer.title}</h3></div>
      </div>
      <p className="offer-description">{offer.description}</p>
      <div className="offer-tags"><span><Icon name="ruler" />{offer.size}</span><span><Icon name="box" />{formatQuantity(offer.weight)}</span></div>
      <p className="offer-location"><Icon name="pin" />{offer.location}</p>
      <div className="offer-bottom"><p className="offer-price">{formatPrice(offer.price)} <small>/ kg</small></p>
        <a className="button button-secondary" aria-label={`Ver oferta: ${offer.title}`} href={offerHref(offer.id)}>Ver oferta</a></div>
    </div>
  </article>
}
