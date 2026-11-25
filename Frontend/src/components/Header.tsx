import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { Avatar } from './Avatar'
import { Brand } from './Brand'
import './Header.css'

export function Header({ pending = false, authenticated = false, marketplace = false, products = false, producers = false, adminArea = false, producer = false, administrator = false, moderator = false, accountName = '', profilePicture, onLogout, onRetrySession, loggingOut = false }: { pending?: boolean; authenticated?: boolean; marketplace?: boolean; products?: boolean; producers?: boolean; adminArea?: boolean; producer?: boolean; administrator?: boolean; moderator?: boolean; accountName?: string; profilePicture?: string | null; onRetrySession?: () => void; onLogout?: () => Promise<void>; loggingOut?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [headerHidden, setHeaderHidden] = useState(() => window.scrollY > (window.innerWidth <= 1240 ? 64 : 80))
  const headerRef = useRef<HTMLElement>(null)
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    let previousY = Math.max(0, window.scrollY)
    let frame = 0
    const header = headerRef.current
    setHeaderHidden(previousY > (header?.offsetHeight ?? 80))
    const update = () => {
      frame = 0
      const currentY = Math.max(0, window.scrollY)
      const header = headerRef.current
      const engaged = header?.contains(document.activeElement)
        || header?.querySelector('.header-navigation.is-open, .header-account-menu[open]')
      if (currentY <= (header?.offsetHeight ?? 80) || engaged) {
        setHeaderHidden(false)
        previousY = currentY
      } else if (Math.abs(currentY - previousY) >= 4) {
        setHeaderHidden(currentY > previousY)
        previousY = currentY
      }
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 1240px)')
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
    <header ref={headerRef} onFocusCapture={() => setHeaderHidden(false)} className={`site-header${headerHidden ? ' is-scroll-hidden' : ''}`}>
      <div className="container header-inner">
        <a href="/" className="brand" aria-label="RedeCamarão — início" onClick={() => setMenuOpen(false)}><Brand /></a>
        {!pending && authenticated && administrator && adminArea && <span className="header-role">{moderator ? 'Moderador' : 'Administrador'}</span>}
        <button ref={menuToggleRef} className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="main-navigation" aria-expanded={menuOpen} disabled={pending} onClick={() => setMenuOpen(open => !open)}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <div id="main-navigation" aria-busy={pending} inert={pending} className={`header-navigation${pending ? ' is-pending' : ''} ${menuOpen ? 'is-open' : ''}`}>
          <nav aria-label="Navegação principal">
            <a href="/marketplace" aria-current={marketplace ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Marketplace</a>
            <a href="/produtos" aria-current={products ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Ofertas</a>
            <a href="/produtores" aria-current={producers ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Produtores</a>
            {administrator && <a href="/admin" aria-current={adminArea ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Área administrativa</a>}
          </nav>
          <div className="header-actions">
            {authenticated ? <details className="header-account-menu">
              <summary className="header-account" aria-label={administrator ? 'Menu da conta administrativa' : 'Menu da conta'}>
                <Avatar className="header-avatar" src={profilePicture} fallback={administrator ? 'shield' : producer ? 'farm' : 'bag'} />
                <span>{accountName || 'Minha conta'}</span>
                <Icon name="chevron" className="header-account-chevron" />
              </summary>
              <div className="header-account-options" onClick={event => { if ((event.target as HTMLElement).closest('a')) { event.currentTarget.closest('details')?.removeAttribute('open'); setMenuOpen(false) } }}>
                <a href={administrator ? '/admin/perfil' : '/painel#perfil'}>Acessar perfil</a>
                <button type="button" className="header-logout" disabled={loggingOut} onClick={() => { setLogoutError(''); void onLogout?.().catch(error => setLogoutError(error instanceof Error ? error.message : 'Não foi possível sair agora.')) }}><Icon name="logout" />{loggingOut ? 'Saindo...' : 'Sair da conta'}</button>
                {logoutError && <p className="header-logout-error" role="alert">{logoutError}</p>}
              </div>
            </details> : authenticated ? <a className="button button-primary" href="/painel" onClick={() => setMenuOpen(false)}>Minha conta</a> : onRetrySession ? (
              <button type="button" className="button button-primary" onClick={onRetrySession}>Tentar recuperar sessão</button>
            ) : <>
              <a className="login-link" href="/entrar" onClick={() => setMenuOpen(false)}>Entrar</a>
              <a className="button button-primary" href="/registro" onClick={() => setMenuOpen(false)}>Criar conta</a>
            </>}
          </div>
        </div>
      </div>
    </header>
  )
}
