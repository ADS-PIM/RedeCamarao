export type IconName = 'bag' | 'store' | 'check' | 'info' | 'arrow' | 'menu' | 'close' | 'eye' | 'eye-off' | 'search' | 'waves' | 'sparkle' | 'ruler' | 'box' | 'pin' | 'chat' | 'handshake' | 'filters' | 'calendar' | 'share' | 'bookmark' | 'grid'

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
      {name === 'calendar' && <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M7 2v4m10-4v4M3 10h18" /></>}
      {name === 'share' && <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" /></>}
      {name === 'bookmark' && <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />}
      {name === 'grid' && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
      {name === 'filters' && <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="8" cy="6" r="2" fill="white" /><circle cx="16" cy="12" r="2" fill="white" /><circle cx="10" cy="18" r="2" fill="white" /></>}
      {name === 'search' && <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>}
      {name === 'waves' && <path d="M2 5q2.5 4 5 0t5 0 5 0 5 0M2 12q2.5 4 5 0t5 0 5 0 5 0M2 19q2.5 4 5 0t5 0 5 0 5 0" />}
      {name === 'sparkle' && <><path d="m12 2 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" /><circle cx="3" cy="21" r="1" /></>}
      {name === 'ruler' && <><path d="m2 7 5-5 15 15-5 5ZM7 7l2-2m2 6 2-2m2 6 2-2" /></>}
      {name === 'box' && <><path d="m12 2 10 5v10l-10 5-10-5V7Zm0 10v10M2 7l10 5 10-5M7 4.5l10 5V15" /></>}
      {name === 'pin' && <><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0 1 18 0Z" /><circle cx="12" cy="10" r="3" /></>}
      {name === 'chat' && <path d="M21 11.5a9.5 9.5 0 0 1-14 8.4L2 21l1.1-5A9.5 9.5 0 1 1 21 11.5Z" />}
      {name === 'handshake' && <><path d="m2 3 4-1 4 3m12-2-4-1-5 2-5 5 2 2 4-3 7 7-5 6-5-1-7-7M2 3 1 13l3 1M22 3l1 10-3 2m-7-1 5 5m-8-2 4 4" /></>}
      {(name === 'eye' || name === 'eye-off') && <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{name === 'eye-off' && <path d="m3 3 18 18" />}</>}
    </svg>
  )
}
