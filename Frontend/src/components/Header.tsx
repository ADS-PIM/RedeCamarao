import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import './Header.css'

export function Header({ authenticated = false, marketplace = false, products = false }: { authenticated?: boolean; marketplace?: boolean; products?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 1000px)')
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMenuOpen(false)
    }
    const closeMenu = () => setMenuOpen(false)

    mobileViewport.addEventListener('change', handleViewportChange)
    window.addEventListener('popstate', closeMenu)
    return () => {
      mobileViewport.removeEventListener('change', handleViewportChange)
      window.removeEventListener('popstate', closeMenu)
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
    <header ref={headerRef} className="site-header">
      <div className="container header-inner">
        <a href="/" className="brand" aria-label="RedeCamarão — início" onClick={() => setMenuOpen(false)}><strong>Rede</strong>Camarão</a>
        <button ref={menuToggleRef} className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <div id="main-navigation" className={`header-navigation ${menuOpen ? 'is-open' : ''}`}>
          <nav aria-label="Navegação principal">
            <a href="/marketplace" aria-current={marketplace ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Marketplace</a><a href="/produtos" aria-current={products ? 'page' : undefined} onClick={() => setMenuOpen(false)}>Produtos</a>
            <a href="/marketplace#produtores" onClick={() => setMenuOpen(false)}>Produtores</a><a href="/marketplace#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
          </nav>
          <div className="header-actions">
            {authenticated ? <a className="button button-primary" href="/entrar" onClick={() => setMenuOpen(false)}>Minha conta</a> : <>
              <a className="login-link" href="/entrar" onClick={() => setMenuOpen(false)}>Entrar</a>
              <a className="button button-primary" href="/registro" onClick={() => setMenuOpen(false)}>Criar conta</a>
            </>}
          </div>
        </div>
      </div>
    </header>
  )
}
