import './Footer.css'
import { Brand } from './Brand'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-main">
          <div className="footer-about">
            <a href="/" className="footer-brand" aria-label="RedeCamarão — página inicial"><Brand /></a>
            <p className="footer-description">Aproximamos compradores e produtores de camarão. A negociação e o pagamento acontecem diretamente entre as partes.</p>
          </div>
          <nav className="footer-quick-menu" aria-labelledby="footer-menu-title">
            <h2 id="footer-menu-title">Menu rápido</h2>
            <ul className="footer-links">
              <li><a href="/marketplace">Marketplace</a></li>
              <li><a href="/produtos">Ofertas de camarão</a></li>
              <li><a href="/produtores">Nossos produtores</a></li>
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright">© {year} RedeCamarão. Todos os direitos reservados.</p>
          <nav aria-label="Informações legais">
            <ul className="footer-legal-links">
              <li><a href="/privacidade">Política de Privacidade</a></li>
              <li><a href="/termos">Termos de Uso</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
