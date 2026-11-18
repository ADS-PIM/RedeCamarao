import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { GalleryPhoto } from '../data/offerDetail'
import { Icon } from './Icon'
import { Photo } from './Photo'

function GalleryImage({ photo, priority = false }: { photo: GalleryPhoto; priority?: boolean }) {
  return <Photo src={photo.src} alt={photo.description} priority={priority} />
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
      <p className="offer-lightbox-caption" role="status">Foto {index + 1} de {total}</p>
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
  const current = selected < photos.length ? selected : 0
  const photo = photos[current]
  if (!photo) return <div className="offer-gallery"><div className="offer-gallery-main"><Photo alt="" emptyMessage="Sem fotos cadastradas" /></div></div>
  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setSelected(index => (index + (event.key === 'ArrowRight' ? 1 : -1) + photos.length) % photos.length)
    }
  }

  return (
    <div className="offer-gallery" onKeyDown={handleKey}>
      <button className="offer-gallery-main" type="button" aria-label={`Ampliar foto ${current + 1} de ${photos.length}`} onClick={() => setExpanded(true)}>
        <GalleryImage key={photo.id} photo={photo} priority />
        <span className="offer-gallery-caption">Foto {current + 1} de {photos.length}</span>
      </button>
      {photos.length > 1 && <div className="offer-gallery-thumbnails" aria-label="Selecionar foto">
        {photos.slice(0, 3).map((item, index) => <button type="button" key={item.id} className={current === index ? 'is-selected' : ''} aria-pressed={current === index}
          aria-label={index === 2 && photos.length > 3 ? `Ver todas as ${photos.length} fotos` : `Ver foto ${index + 1}`}
          onClick={() => { setSelected(index); if (index === 2 && photos.length > 3) setExpanded(true) }}>
          <GalleryImage photo={item} />
          {index === 2 && photos.length > 3 && <span className="offer-gallery-more"><Icon name="images" />+{photos.length - 2} fotos</span>}
        </button>)}
      </div>}
      {expanded && <Lightbox photo={photo} index={current} total={photos.length} onChange={setSelected} onClose={() => setExpanded(false)} />}
    </div>
  )
}
