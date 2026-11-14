import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { Avatar } from './Avatar'
import './Header.css'

export function Header({ authenticated = false, marketplace = false, products = false, producers = false, account = false, producer = false, userId, accountName = '', profilePicture, editingOffer = false, onLogout, loggingOut = false }: { authenticated?: boolean; marketplace?: boolean; products?: boolean; producers?: boolean; account?: boolean; producer?: boolean; userId?: string; accountName?: string; profilePicture?: string | null; editingOffer?: boolean; onLogout?: () => Promise<void>; loggingOut?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const headerRef = useRef<HTMLElement>(null)
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 1000px)')
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMenuOpen(false)
    }
    const closeMenu = () => {
      setMenuOpen(false)
      const accountMenu = headerRef.current?.querySelector<HTMLDetailsElement>('.header-account-menu')
      if (accountMenu) accountMenu.open = false
    }
    const dismissAccountMenu = (event: Event) => {
      const accountMenu = headerRef.current?.querySelector<HTMLDetailsElement>('.header-account-menu[open]')
      if (!accountMenu) return
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        accountMenu.querySelector<HTMLElement>('summary')?.focus()
      } else if (event.target instanceof Node && accountMenu.contains(event.target)) return
      accountMenu.open = false
    }

    mobileViewport.addEventListener('change', handleViewportChange)
    window.addEventListener('popstate', closeMenu)
    document.addEventListener('pointerdown', dismissAccountMenu)
    document.addEventListener('keydown', dismissAccountMenu)
    return () => {
      mobileViewport.removeEventListener('change', handleViewportChange)
      window.removeEventListener('popstate', closeMenu)
      document.removeEventListener('pointerdown', dismissAccountMenu)
      document.removeEventListener('keydown', dismissAccountMenu)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuToggleRef.current?.focus()
      }
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [menuOpen])

  return (
    <header ref={headerRef} className={`site-header${account && producer ? ' producer-header' : ''}`}>
      <div className="container header-inner">
        <a href="/" className="brand" aria-label="RedeCamarão — início" onClick={() => setMenuOpen(false)}><strong>Rede</strong>Camarão</a>
        {authenticated && account && <span className="header-role">{producer ? 'Produtor' : 'Comprador'}</span>}
        <button ref={menuToggleRef} className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <div id="main-navigation" className={`header-navigation ${menuOpen ? 'is-open' : ''}`}>
          <nav aria-label="Navegação principal">
            {account && producer ? <>
              <a href="/painel" aria-current={!editingOffer ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Painel</a>
              <a href="/painel/ofertas" aria-current={editingOffer ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Minhas ofertas</a>
              <a href={`/produtores/${encodeURIComponent(userId ?? '')}`} onClick={() => setMenuOpen(false)}>Perfil público</a>
            </> : account ? <>
              <a href="/painel" aria-current="page" onClick={() => setMenuOpen(false)}>Minha conta</a>
              <a href="/painel#salvas" onClick={() => setMenuOpen(false)}>Ofertas salvas</a>
              <a href="/painel#perfil" onClick={() => setMenuOpen(false)}>Dados pessoais</a>
              <a href="/produtos" onClick={() => setMenuOpen(false)}>Explorar ofertas</a>
            </> : <>
              <a href="/marketplace" aria-current={marketplace ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Marketplace</a><a href="/produtos" aria-current={products ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Produtos</a>
              <a href="/produtores" aria-current={producers ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Produtores</a>
            </>}
          </nav>
          <div className="header-actions">
            {authenticated && account ? <details className="header-account-menu">
              <summary className="header-account" aria-label="Menu da conta"><Avatar className="header-avatar" src={profilePicture} fallback={producer ? 'farm' : 'bag'} /><span>{accountName || 'Minha conta'}</span><Icon name="chevron" className="header-account-chevron" /></summary>
              <div className="header-account-options" onClick={event => { if ((event.target as HTMLElement).closest('a')) { event.currentTarget.closest('details')?.removeAttribute('open'); setMenuOpen(false) } }}>
                <a href="/marketplace">Ver marketplace</a>
                <button type="button" className="header-logout" disabled={loggingOut} onClick={() => { setLogoutError(''); void onLogout?.().catch(error => setLogoutError(error instanceof Error ? error.message : 'Não foi possível sair agora.')) }}><Icon name="logout" />{loggingOut ? 'Saindo...' : 'Sair da conta'}</button>
                {logoutError && <p className="header-logout-error" role="alert">{logoutError}</p>}
              </div>
            </details> : authenticated ? <a className="button button-primary" href="/painel" onClick={() => setMenuOpen(false)}>Minha conta</a> : <>
              <a className="login-link" href="/entrar" onClick={() => setMenuOpen(false)}>Entrar</a>
              <a className="button button-primary" href="/registro" onClick={() => setMenuOpen(false)}>Criar conta</a>
            </>}
          </div>
        </div>
      </div>
    </header>
  )
}
