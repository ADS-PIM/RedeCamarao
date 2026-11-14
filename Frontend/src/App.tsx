import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { logoutUser, restoreSession } from './services/auth'
import type { UserSession } from './services/auth'
import { RegisterPage } from './pages/RegisterPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { ProductsPage } from './pages/ProductsPage'
import { OfferPage } from './pages/OfferPage'
import { ProducersPage } from './pages/ProducersPage'
import { ProducerProfilePage } from './pages/ProducerProfilePage'
import { AccountPage } from './pages/AccountPage'
import { OfferEditorPage } from './pages/OfferEditorPage'
import { MyOffersPage } from './pages/MyOffersPage'
import { editOfferIdFromPath } from './data/offerEditor'
import { producerIdFromPath } from './data/producers'
import { offerIdFromPath } from './data/offerDetail'
import { useNavigation } from './hooks/useNavigation'
import './App.css'

function App() {
  const { pathname, handleLinkClick, navigate } = useNavigation()
  const [session, setSession] = useState<UserSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [accountIdentity, setAccountIdentity] = useState({ id: '', name: '' })
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutPending = useRef(false)
  const updateAccountName = useCallback((name: string) => setAccountIdentity({ id: session?.userId ?? '', name }), [session?.userId])
  const isMarketplace = ['/', '/marketplace', '/marketplace/'].includes(pathname)
  const isProducts = ['/produtos', '/produtos/'].includes(pathname)
  const offerId = offerIdFromPath(pathname)
  const isProducers = ['/produtores', '/produtores/'].includes(pathname)
  const producerId = producerIdFromPath(pathname)
  const isRegister = ['/registro', '/registro/'].includes(pathname)
  const isLogin = ['/entrar', '/entrar/', '/login', '/login/'].includes(pathname)
  const isAccount = ['/painel', '/painel/', '/perfil', '/perfil/'].includes(pathname)
  const editingOfferId = editOfferIdFromPath(pathname)
  const isNewOffer = ['/painel/ofertas/nova', '/painel/ofertas/nova/'].includes(pathname)
  const isMyOffers = ['/painel/ofertas', '/painel/ofertas/'].includes(pathname)

  async function handleLogout() {
    if (logoutPending.current) return
    logoutPending.current = true; setLoggingOut(true)
    try {
      await logoutUser()
      setSession(null); setAccountIdentity({ id: '', name: '' }); navigate('/entrar')
    } finally { logoutPending.current = false; setLoggingOut(false) }
  }

  useEffect(() => {
    document.title = `${isNewOffer ? 'Cadastrar oferta' : isMyOffers ? 'Minhas ofertas' : editingOfferId ? 'Editar oferta' : isMarketplace ? 'Marketplace' : offerId ? 'Oferta de camarão' : isProducts ? 'Produtos' : producerId ? 'Produtor' : isProducers ? 'Produtores' : isRegister ? 'Criar conta' : isLogin ? 'Entrar' : isAccount ? 'Minha conta' : 'Página indisponível'} | RedeCamarão`
  }, [isMarketplace, isProducts, offerId, isProducers, producerId, isRegister, isLogin, isAccount, editingOfferId, isNewOffer, isMyOffers])

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
      <Header authenticated={Boolean(session)} marketplace={isMarketplace} products={isProducts || Boolean(offerId)} producers={isProducers || Boolean(producerId)} account={isAccount || isNewOffer || isMyOffers || Boolean(editingOfferId)} editingOffer={isNewOffer || isMyOffers || Boolean(editingOfferId)} producer={session?.userType === 'PRODUCER'} userId={session?.userId} accountName={accountIdentity.id === session?.userId ? accountIdentity.name : ''} onLogout={handleLogout} loggingOut={loggingOut} />
      {editingOfferId || isNewOffer ? <OfferEditorPage key={`${session?.userId ?? 'anonymous'}:${editingOfferId ?? 'new'}`} offerId={editingOfferId ?? undefined} session={session} restoring={restoring} onSessionChange={setSession} onProfileLoad={updateAccountName} onCreated={navigate} /> : isMyOffers ? <MyOffersPage key={session?.userId ?? 'anonymous'} session={session} restoring={restoring} onSessionChange={setSession} onProfileLoad={updateAccountName} /> : <>
      {isMarketplace ? <MarketplacePage /> : offerId ? <OfferPage key={offerId} offerId={offerId} /> : isProducts ? <ProductsPage /> : producerId ? <ProducerProfilePage key={producerId} producerId={producerId} /> : isProducers ? <ProducersPage /> : isLogin ? <LoginPage session={session} restoring={restoring} onSessionChange={setSession} /> : isRegister ? <RegisterPage /> : isAccount ? <AccountPage key={session?.userId ?? 'anonymous'} session={session} restoring={restoring} onSessionChange={setSession} onProfileLoad={updateAccountName} /> : (
        <main id="main-content" className="unavailable-page container">
          <h1>Esta página ainda não está disponível.</h1>
          <p>Você já pode criar sua conta na RedeCamarão.</p>
          <a className="button button-primary" href="/registro">Criar conta</a>
        </main>
      )}
      </>}
      <Footer />
    </div>
  )
}
export default App
