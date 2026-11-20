import './Footer.css'
import { Brand } from './Brand'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <a href="/" className="footer-brand" aria-label="RedeCamarão — página inicial"><Brand /></a>
        <p className="footer-description">A plataforma aproxima compradores e produtores. Negociação e pagamento acontecem fora da plataforma.</p>
        <nav aria-label="Links do rodapé">
          <ul className="footer-links">
            <li><a href="/ajuda">Ajuda</a></li>
            <li><a href="/termos">Termos</a></li>
            <li><a href="/privacidade">Privacidade</a></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
