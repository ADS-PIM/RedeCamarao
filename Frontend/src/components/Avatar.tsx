import { useState } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './Avatar.css'

export function Avatar({ src, className = '', alt = '', fallback = 'farm' }: {
  src?: string | null; className?: string; alt?: string; fallback?: IconName
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return <span className={`profile-avatar ${className}`}>
    {src && failed !== src ? <img src={src} alt={alt} decoding="async" onError={() => setFailed(src)} /> : <Icon name={fallback} />}
  </span>
}
