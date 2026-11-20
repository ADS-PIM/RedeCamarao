import { useState } from 'react'
import { Icon } from './Icon'
import './Photo.css'

export function Photo({ src, alt, emptyMessage = 'Sem foto', priority = false }: {
  src?: string | null; alt: string; emptyMessage?: string; priority?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) {
    return <div className="photo-placeholder" role="img" aria-label={src ? 'Foto indisponível' : emptyMessage}>
      <Icon name="images" /><p>{src ? 'Foto indisponível' : emptyMessage}</p>
    </div>
  }
  return <img src={src} alt={alt} width="1200" height="675" loading={priority ? 'eager' : 'lazy'}
    decoding={priority ? 'sync' : 'async'} fetchPriority={priority ? 'high' : 'auto'} onError={() => setFailed(src)} />
}
