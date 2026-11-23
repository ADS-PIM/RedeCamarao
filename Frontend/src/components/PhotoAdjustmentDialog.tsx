import { useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { dragPhoto, exportAdjustedPhoto, initialPhotoAdjustment, maximumZoom, minimumZoom, normalizePhotoAdjustment, offerPhotoAspect, photoGeometry, zoomWithWheel } from '../utils/photoAdjustment'
import type { PhotoAdjustment } from '../utils/photoAdjustment'
import './PhotoAdjustmentDialog.css'

export function PhotoAdjustmentDialog({ source, kind, initial = initialPhotoAdjustment, pendingCount = 0, onApply, onClose }: {
  source: string; kind: 'profile' | 'offer'; initial?: PhotoAdjustment; pendingCount?: number
  onApply: (data: string, adjustment: PhotoAdjustment) => void; onClose: () => void
}) {
  const id = useId()
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [settings, setSettings] = useState(() => normalizePhotoAdjustment(initial))
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const applyingRef = useRef(false)
  const drag = useRef<{ pointerId: number; x: number; y: number; settings: PhotoAdjustment } | null>(null)
  const aspect = kind === 'profile' ? 1 : offerPhotoAspect

  useEffect(() => {
    let active = true
    const next = new Image()
    if (/^https?:\/\//i.test(source)) next.crossOrigin = 'anonymous'
    next.onload = () => { if (active) setImage(next) }
    next.onerror = () => { if (active) setError('Não foi possível abrir esta foto para ajuste. Tente selecionar o arquivo novamente.') }
    next.src = source
    return () => { active = false; next.onload = null; next.onerror = null }
  }, [source])

  useEffect(() => {
    const element = frame.current
    if (!element || !image) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      if (applyingRef.current) return
      setSettings(current => ({ ...current, zoom: zoomWithWheel(current.zoom, event.deltaY) }))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [image])

  const dimensions = image ? { width: image.naturalWidth, height: image.naturalHeight } : null
  const geometry = dimensions ? photoGeometry(dimensions, { width: 1000, height: 1000 / aspect }, settings) : null
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!image || applying || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, settings }
    setDragging(true)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || start.pointerId !== event.pointerId || !dimensions || applying) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y
    setSettings(current => dragPhoto(dimensions, bounds, { ...start.settings, zoom: current.zoom }, deltaX, deltaY))
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null; setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function change(key: keyof PhotoAdjustment, value: string) {
    setSettings(current => normalizePhotoAdjustment({ ...current, [key]: Number(value) }))
  }
  async function apply() {
    if (!image || applyingRef.current) return
    applyingRef.current = true; setApplying(true); setError('')
    try {
      const data = await exportAdjustedPhoto(image, settings, aspect)
      onApply(data, { ...settings })
    } catch {
      setError('Não foi possível aplicar o ajuste. Tente novamente ou selecione o arquivo da foto no seu dispositivo.')
    } finally { applyingRef.current = false; setApplying(false) }
  }
  const slider = (key: keyof PhotoAdjustment, label: string, disabled = false) => <div className="photo-adjust-control">
    <div><label htmlFor={`${id}-${key}`}>{label}</label><output htmlFor={`${id}-${key}`}>{settings[key]}%</output></div>
    <input id={`${id}-${key}`} type="range" min={key === 'zoom' ? minimumZoom : 0} max={key === 'zoom' ? maximumZoom : 100} step={1}
      value={settings[key]} disabled={applying || !image || disabled} onChange={event => change(key, event.target.value)} aria-valuetext={`${settings[key]}%`} />
  </div>

  return <Dialog titleId={`${id}-title`} descriptionId={`${id}-description`} className="photo-adjust-dialog" busy={applying} onClose={onClose}>
    <div className="photo-adjust-header">
      <div><h2 id={`${id}-title`}>{kind === 'profile' ? 'Ajustar foto de perfil' : 'Ajustar foto da oferta'}</h2>
        <p id={`${id}-description`}>Arraste a imagem, use a roda do mouse para dar zoom ou ajuste pelos controles.</p></div>
      <button type="button" className="photo-adjust-close" aria-label="Fechar ajuste de foto" disabled={applying} onClick={onClose}><Icon name="close" /></button>
    </div>
    <div className="photo-adjust-body">
      <div className={`photo-adjust-stage photo-adjust-${kind}`}>
        {!image && <p role="status">{error ? 'Foto indisponível' : 'Carregando foto...'}</p>}
        {image && geometry && <div ref={frame} className={`photo-adjust-frame${dragging ? ' is-dragging' : ''}`} style={{ aspectRatio: aspect }}
          role="img" aria-label="Prévia do enquadramento da foto; arraste para reposicionar ou use os controles abaixo"
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={() => { drag.current = null; setDragging(false) }}>
          <img src={image.src} alt="" draggable={false} style={{ width: `${geometry.width / 1000 * 100}%`, height: `${geometry.height / (1000 / aspect) * 100}%`, left: `${geometry.left / 1000 * 100}%`, top: `${geometry.top / (1000 / aspect) * 100}%` }} />
          <span className="photo-adjust-grid" aria-hidden="true" />
        </div>}
      </div>
      <div className="photo-adjust-controls">
        {slider('zoom', 'Zoom')}
        <div className="photo-adjust-positions">{slider('horizontal', 'Posição horizontal', !geometry || geometry.overflowX < .01)}{slider('vertical', 'Posição vertical', !geometry || geometry.overflowY < .01)}</div>
        <button type="button" className="photo-adjust-reset" disabled={applying || !image} onClick={() => setSettings({ ...initialPhotoAdjustment })}>Restaurar enquadramento</button>
      </div>
      {error && <p className="photo-adjust-error" role="alert">{error}</p>}
    </div>
    <div className="photo-adjust-footer">
      <p>{kind === 'profile' ? 'A imagem será enviada ao clicar em “Salvar foto”.' : 'A imagem será enviada ao salvar a oferta.'}{pendingCount > 0 && ` Depois desta, faltam ${pendingCount} ${pendingCount === 1 ? 'foto para ajustar' : 'fotos para ajustar'}.`}</p>
      <div><button type="button" className="button button-secondary" disabled={applying} onClick={onClose}>Cancelar</button>
        <button type="button" className="button button-success" disabled={applying || !image} onClick={() => void apply()}>{applying ? 'Aplicando...' : 'Aplicar ajuste'}</button></div>
    </div>
  </Dialog>
}
