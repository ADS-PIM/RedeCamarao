type IconName = 'bag' | 'store' | 'check' | 'info' | 'arrow' | 'menu' | 'close' | 'eye' | 'eye-off'

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'bag' && <><rect x="3" y="3" width="18" height="19" rx="2" /><path d="M7 3V2h10v1M7 7h10M8 10a4 4 0 0 0 8 0" /></>}
      {name === 'store' && <><path d="m3 9 3-6h12l3 6v2a3 3 0 0 1-4 2 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-4-2V9ZM5 14v8h14v-8M9 22v-6h6v6M3 9h18" /></>}
      {name === 'check' && <><path d="M21 11v1a9 9 0 1 1-5.4-8.2" /><path d="m8 11 4 4L22 5" /></>}
      {name === 'info' && <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>}
      {name === 'arrow' && <path d="M3 12h18m-8-8 8 8-8 8" />}
      {name === 'menu' && <path d="M4 6h16M4 12h16M4 18h16" />}
      {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
      {(name === 'eye' || name === 'eye-off') && <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{name === 'eye-off' && <path d="m3 3 18 18" />}</>}
    </svg>
  )
}
