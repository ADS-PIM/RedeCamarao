import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { GalleryPhoto } from '../data/offerDetail'
import { Icon } from './Icon'

function GalleryImage({ photo, priority = false }: { photo: GalleryPhoto; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  return failed ? <div className="offer-photo-unavailable" role="img" aria-label="Foto indisponível"><Icon name="info" /><p>Foto indisponível</p></div>
    : <img src={photo.src} alt={photo.description} onError={() => setFailed(true)} width="1200" height="1000" loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : 'auto'} />
}

function Lightbox({ photo, index, total, onChange, onClose }: {
  photo: GalleryPhoto; index: number; total: number; onChange: (index: number) => void; onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previous }
  }, [])
  return (
    <dialog ref={ref} className="offer-lightbox" aria-label="Galeria de fotos da oferta"
      onClose={event => { if (!event.currentTarget.open) onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <button className="offer-lightbox-close" type="button" aria-label="Fechar galeria" onClick={onClose} autoFocus><Icon name="close" /></button>
      <div className="offer-lightbox-image"><GalleryImage key={photo.id} photo={photo} priority /></div>
      <p className="offer-lightbox-caption" role="status">Foto {index + 1} de {total}{photo.illustrative ? ' · Imagem ilustrativa' : ''}</p>
      <div className="offer-lightbox-controls">
        <button type="button" onClick={() => onChange((index - 1 + total) % total)} disabled={total < 2}>Anterior</button>
        <button type="button" onClick={() => onChange((index + 1) % total)} disabled={total < 2}>Próxima</button>
      </div>
    </dialog>
  )
}

export function OfferGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [selected, setSelected] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const photo = photos[selected]
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setSelected(index => (index + (event.key === 'ArrowRight' ? 1 : -1) + photos.length) % photos.length)
    }
  }

  return (
    <div className="offer-gallery" onKeyDown={handleKey}>
      <button className="offer-gallery-main" type="button" aria-label={`Ampliar foto ${selected + 1} de ${photos.length}`} onClick={() => setExpanded(true)}>
        <GalleryImage key={photo.id} photo={photo} priority />
        <span className="offer-gallery-caption">{photo.illustrative ? 'Foto ilustrativa' : `Foto ${selected + 1} de ${photos.length}`}</span>
      </button>
      {photos.length > 1 && <div className="offer-gallery-thumbnails" aria-label="Selecionar foto">
        {photos.slice(0, 3).map((item, index) => <button type="button" key={item.id} className={selected === index ? 'is-selected' : ''} aria-pressed={selected === index}
          aria-label={index === 2 && photos.length > 3 ? `Ver todas as ${photos.length} fotos` : `Ver foto ${index + 1}`}
          onClick={() => { setSelected(index); if (index === 2 && photos.length > 3) setExpanded(true) }}>
          <GalleryImage photo={item} />
          {index === 2 && photos.length > 3 && <span className="offer-gallery-more"><Icon name="grid" />+{photos.length - 2} fotos</span>}
        </button>)}
      </div>}
      {photo.illustrative && <p className="offer-gallery-note">Imagens ilustrativas. Este anúncio ainda não tem fotos do lote.</p>}
      {expanded && <Lightbox photo={photo} index={selected} total={photos.length} onChange={setSelected} onClose={() => setExpanded(false)} />}
    </div>
  )
}
