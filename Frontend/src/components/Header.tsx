import { useState } from 'react'
import { Icon } from './Icon'
import './Header.css'

export function Header({ authenticated = false, marketplace = false }: { authenticated?: boolean; marketplace?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="/" className="brand" aria-label="RedeCamarão — início"><strong>Rede</strong>Camarão</a>
        <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="main-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <div id="main-navigation" className={`header-navigation ${menuOpen ? 'is-open' : ''}`}>
          <nav aria-label="Navegação principal">
            <a href="/marketplace" aria-current={marketplace ? 'page' : undefined}>Marketplace</a><a href="/marketplace#ofertas" onClick={() => setMenuOpen(false)}>Produtos</a>
            <a href="/marketplace#produtores" onClick={() => setMenuOpen(false)}>Produtores</a><a href="/marketplace#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
          </nav>
          <div className="header-actions">
            {authenticated ? <a className="button button-primary" href="/entrar">Minha conta</a> : <>
              <a className="login-link" href="/entrar">Entrar</a>
              <a className="button button-primary" href="/registro">Criar conta</a>
            </>}
          </div>
        </div>
      </div>
    </header>
  )
}
