import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { useEffect, useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { restoreSession } from './services/auth'
import type { UserSession } from './services/auth'
import { RegisterPage } from './pages/RegisterPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { ProductsPage } from './pages/ProductsPage'
import { OfferPage } from './pages/OfferPage'
import { ProducersPage } from './pages/ProducersPage'
import { ProducerProfilePage } from './pages/ProducerProfilePage'
import { producerIdFromPath } from './data/producers'
import { offerIdFromPath } from './data/offerDetail'
import { useNavigation } from './hooks/useNavigation'
import './App.css'

function App() {
  const { pathname, handleLinkClick } = useNavigation()
  const [session, setSession] = useState<UserSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  const isMarketplace = ['/', '/marketplace', '/marketplace/'].includes(pathname)
  const isProducts = ['/produtos', '/produtos/'].includes(pathname)
  const offerId = offerIdFromPath(pathname)
  const isProducers = ['/produtores', '/produtores/'].includes(pathname)
  const producerId = producerIdFromPath(pathname)
  const isRegister = ['/registro', '/registro/'].includes(pathname)
  const isLogin = ['/entrar', '/entrar/', '/login', '/login/'].includes(pathname)

  useEffect(() => {
    document.title = `${isMarketplace ? 'Marketplace' : offerId ? 'Oferta de camarão' : isProducts ? 'Produtos' : producerId ? 'Produtor' : isProducers ? 'Produtores' : isRegister ? 'Criar conta' : isLogin ? 'Entrar' : 'Página indisponível'} | RedeCamarão`
  }, [isMarketplace, isProducts, offerId, isProducers, producerId, isRegister, isLogin])

  useEffect(() => {
    let active = true
    restoreSession().then(value => { if (active) setSession(value) })
      .catch(() => { /* An unavailable or expired session leaves the login form available. */ })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])

  return (
    <div className={`app-shell${isMarketplace ? ' marketplace-shell' : ''}`} onClick={handleLinkClick}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header authenticated={Boolean(session)} marketplace={isMarketplace} products={isProducts || Boolean(offerId)} producers={isProducers || Boolean(producerId)} />
      {isMarketplace ? <MarketplacePage /> : offerId ? <OfferPage key={offerId} offerId={offerId} /> : isProducts ? <ProductsPage /> : producerId ? <ProducerProfilePage key={producerId} producerId={producerId} /> : isProducers ? <ProducersPage /> : isLogin ? <LoginPage session={session} restoring={restoring} onSessionChange={setSession} /> : isRegister ? <RegisterPage /> : (
        <main id="main-content" className="unavailable-page container">
          <h1>Esta página ainda não está disponível.</h1>
          <p>Você já pode criar sua conta na RedeCamarão.</p>
          <a className="button button-primary" href="/registro">Criar conta</a>
        </main>
      )}
      <Footer />
    </div>
  )
}
export default App
