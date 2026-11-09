import { useEffect, useRef } from 'react'
import { Icon } from './Icon'
import { formatDate, formatPrice } from '../data/marketplace'
import type { Offer } from '../data/marketplace'
import './OfferDetails.css'

export function OfferDetails({ offer, onClose, backLabel = 'Voltar ao marketplace' }: {
  offer: Offer; onClose: () => void; backLabel?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = originalOverflow }
  }, [])

  return (
    <dialog ref={ref} className="market-dialog" aria-labelledby="detail-title"
      onClose={event => { if (!event.currentTarget.open) onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <button className="dialog-close" type="button" aria-label="Fechar detalhes" onClick={onClose} autoFocus><Icon name="close" /></button>
      <div className="detail-content">
        <span className="detail-type">{offer.type || 'Oferta de camarão'}</span>
        <h2 id="detail-title">{offer.title}</h2>
        <p>{offer.location}</p>
        <p>{offer.description}</p>
        <p>{offer.size} · Lote de {offer.weight} kg</p>
        <p>Quantidade: {offer.minimumQuantity}–{offer.maximumQuantity} kg</p>
        <p>Disponível de {formatDate(offer.startDate)} até {formatDate(offer.endDate)}</p>
        <p className="detail-price">{formatPrice(offer.price)} <small>/ kg</small></p>
        <button className="button button-secondary" type="button" onClick={onClose}>{backLabel}</button>
      </div>
    </dialog>
  )
}
