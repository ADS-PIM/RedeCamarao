import './Footer.css'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <a href="/" className="footer-brand">RedeCamarão</a>
        <p>A plataforma aproxima compradores e produtores. Negociação e pagamento acontecem fora da plataforma.</p>
        <nav aria-label="Links do rodapé">
          <a href="/ajuda">Ajuda</a><span aria-hidden="true">·</span>
          <a href="/termos">Termos</a><span aria-hidden="true">·</span>
          <a href="/privacidade">Privacidade</a>
        </nav>
      </div>
    </footer>
  )
}
