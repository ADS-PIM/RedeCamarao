import { useState } from 'react'
import { myOffersHref } from '../data/offerEditor'
import { producerHref } from '../data/producers'
import { Icon } from './Icon'
import './AccountNavigation.css'

type AccountNavigationProps =
  | { section: 'dashboard' | 'offers' | 'profile'; producerId: string }
  | { section: 'account' | 'saved' | 'personal' }

export function AccountNavigation(props: AccountNavigationProps) {
  const [expanded, setExpanded] = useState(false)
  const isProducer = 'producerId' in props
  const audience = isProducer ? 'produtor' : 'comprador'
  const links = isProducer ? [
    { section: 'dashboard', label: 'Painel', href: '/painel', icon: 'grid' },
    { section: 'offers', label: 'Minhas ofertas', href: myOffersHref, icon: 'box' },
    { section: 'profile', label: 'Perfil público', href: producerHref(props.producerId), icon: 'store' },
  ] as const : [
    { section: 'account', label: 'Minha conta', href: '/painel', icon: 'grid' },
    { section: 'saved', label: 'Ofertas salvas', href: '/painel#salvas', icon: 'bookmark' },
    { section: 'personal', label: 'Dados pessoais', href: '/painel#perfil', icon: 'edit' },
    { section: 'catalog', label: 'Explorar ofertas', href: '/produtos', icon: 'search' },
  ] as const

  return (
    <nav className="account-nav" aria-label={`Área do ${audience}`}>
      <div className="account-nav-inner">
        <button type="button" className="account-nav-toggle" aria-expanded={expanded} aria-controls="account-nav-links" onClick={() => setExpanded(open => !open)}>
          Menu do {audience} <Icon name="chevron" />
        </button>
        <div id="account-nav-links" className={`account-nav-links${expanded ? ' is-open' : ''}`}>
          {links.map(link => (
            <a key={link.section} href={link.href} aria-current={props.section === link.section ? (link.href.includes('#') ? 'location' : 'page') : undefined} onClick={() => setExpanded(false)}>
              <Icon name={link.icon} />{link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
