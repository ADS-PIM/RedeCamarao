import { useState } from 'react'
import { Icon } from './Icon'
import './Header.css'

export function Header() {
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
            <a href="/marketplace">Marketplace</a><a href="/produtos">Produtos</a>
            <a href="/produtores">Produtores</a><a href="/como-funciona">Como funciona</a>
          </nav>
          <div className="header-actions">
            <a className="login-link" href="/entrar">Entrar</a>
            <a className="button button-primary" href="/registro">Criar conta</a>
          </div>
        </div>
      </div>
    </header>
  )
}
