import { lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { AccountNavigation } from './components/AccountNavigation'
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
import { useAuthenticatedAction } from './hooks/useAuthenticatedAction'
import { fetchMyProfile } from './services/account'
import { getOfferState } from './data/offerAttributes'
import './App.css'

const AdminPage = lazy(() => import('./pages/admin/AdminPage').then(module => ({ default: module.AdminPage })))

function App() {
  const { pathname, hash, handleLinkClick, navigate } = useNavigation()
  const [session, setSession] = useState<UserSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [accountIdentity, setAccountIdentity] = useState<{ id: string; name: string; profilePicture: string | null; state?: string }>({ id: '', name: '', profilePicture: null })
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutPending = useRef(false)
  const updateAccountName = useCallback((name: string, profilePicture: string | null, location: string | null) =>
    setAccountIdentity({ id: session?.userId ?? '', name, profilePicture, state: getOfferState(location ?? '') ?? undefined }), [session?.userId])
  const withSession = useAuthenticatedAction(session, setSession)
  const sessionUserId = session?.userId
  const isMarketplace = ['/', '/marketplace', '/marketplace/'].includes(pathname)
  const isProducts = ['/produtos', '/produtos/'].includes(pathname)
  const requestedReturnTo = new URLSearchParams(window.location.search).get('returnTo')
  const staffLogin = new URLSearchParams(window.location.search).get('acesso') === 'admin'
  const adminReturn = requestedReturnTo && /^\/admin(?:\/(?:ofertas|contas|denuncias|historico|perfil))?\/?$/.test(requestedReturnTo) ? requestedReturnTo : '/admin'
  const returnAfterAuth = requestedReturnTo && (offerIdFromPath(requestedReturnTo) || producerIdFromPath(requestedReturnTo)) ? requestedReturnTo : null
  const offerId = offerIdFromPath(pathname)
  const isProducers = ['/produtores', '/produtores/'].includes(pathname)
  const producerId = producerIdFromPath(pathname)
  const isRegister = ['/registro', '/registro/'].includes(pathname)
  const isLogin = ['/entrar', '/entrar/', '/login', '/login/'].includes(pathname)
  const isAccount = ['/painel', '/painel/', '/perfil', '/perfil/'].includes(pathname)
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/')
  const editingOfferId = editOfferIdFromPath(pathname)
  const isNewOffer = ['/painel/ofertas/nova', '/painel/ofertas/nova/'].includes(pathname)
  const isMyOffers = ['/painel/ofertas', '/painel/ofertas/'].includes(pathname)
  const isOfferManagement = isMyOffers || isNewOffer || Boolean(editingOfferId)
  const producerSection = isAccount ? 'dashboard' : isOfferManagement ? 'offers' : producerId && producerId === session?.userId ? 'profile' : null
  let accountNavigation = null
  if (session?.userType === 'PRODUCER' && producerSection) {
    accountNavigation = <AccountNavigation key={pathname} section={producerSection} producerId={session.userId} />
  } else if (session?.userType === 'BUYER' && isAccount) {
    const section = hash === '#salvas' ? 'saved' : hash === '#perfil' ? 'personal' : 'account'
    accountNavigation = <AccountNavigation key={pathname + hash} section={section} />
  }

  useEffect(() => {
    if (isLogin && session && !restoring && (!staffLogin || session.userType === 'ADMIN')) {
      navigate(returnAfterAuth ?? (session.userType === 'ADMIN' ? adminReturn : '/painel'), { replace: true })
    }
  }, [isLogin, session, restoring, navigate, returnAfterAuth, staffLogin, adminReturn])

  async function handleLogout() {
    if (logoutPending.current) return
    logoutPending.current = true; setLoggingOut(true)
    try {
      await logoutUser()
      setSession(null); setAccountIdentity({ id: '', name: '', profilePicture: null }); navigate('/entrar')
    } finally { logoutPending.current = false; setLoggingOut(false) }
  }

  useEffect(() => {
    document.title = `${isNewOffer ? 'Cadastrar oferta' : isMyOffers ? 'Minhas ofertas' : editingOfferId ? 'Editar oferta' : isAdminArea ? 'Área administrativa' : isMarketplace ? 'Marketplace' : offerId ? 'Oferta de camarão' : isProducts ? 'Produtos' : producerId ? 'Produtor' : isProducers ? 'Produtores' : isRegister ? 'Criar conta' : isLogin ? 'Entrar' : isAccount ? 'Minha conta' : 'Página indisponível'} | RedeCamarão`
  }, [isMarketplace, isProducts, offerId, isProducers, producerId, isRegister, isLogin, isAccount, isAdminArea, editingOfferId, isNewOffer, isMyOffers])

  useEffect(() => {
    let active = true
    restoreSession().then(value => { if (active) setSession(value) })
      .catch((error: unknown) => {
        if (active) setRestoreError(error instanceof Error ? error.message : 'Não foi possível recuperar sua sessão.')
      })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [restoreAttempt])

  function retrySession() {
    setRestoreError('')
    setRestoring(true)
    setRestoreAttempt(attempt => attempt + 1)
  }

  useEffect(() => {
    if (!sessionUserId || restoring || session?.userType === 'ADMIN') return
    let active = true
    void withSession(fetchMyProfile).then(profile => {
      if (active) updateAccountName(profile.name, profile.profilePicture ?? null, profile.location)
    }).catch(() => {
      if (active) setAccountIdentity({ id: sessionUserId, name: '', profilePicture: null })
    })
    return () => { active = false }
  }, [sessionUserId, restoring, session?.userType, withSession, updateAccountName])

  return (
    <div className={`app-shell${isMarketplace ? ' marketplace-shell' : ''}${accountNavigation ? ' account-shell' : ''}`} onClick={handleLinkClick}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header pending={restoring || Boolean(session && session.userType !== 'ADMIN' && accountIdentity.id !== session.userId)} authenticated={Boolean(session)} marketplace={isMarketplace} products={isProducts || Boolean(offerId)} producers={isProducers || Boolean(producerId)} adminArea={isAdminArea} producer={session?.userType === 'PRODUCER'} administrator={session?.userType === 'ADMIN'} moderator={session?.role === 'ADMIN'} accountName={session?.userType === 'ADMIN' ? session.name : accountIdentity.id === session?.userId ? accountIdentity.name : ''} profilePicture={accountIdentity.id === session?.userId ? accountIdentity.profilePicture : null} onRetrySession={restoreError && !session ? retrySession : undefined} onLogout={handleLogout} loggingOut={loggingOut} />
      {accountNavigation}
      {restoreError && !session && (isAccount || isOfferManagement || isAdminArea) ? (
        <main id="main-content" className="account-main">
          <section className="container account-status">
            <h1>Não foi possível verificar sua sessão</h1>
            <p role="alert">{restoreError}</p>
            <button type="button" className="button button-primary" onClick={retrySession}>Tentar novamente</button>
          </section>
        </main>
      ) : editingOfferId || isNewOffer ? <OfferEditorPage key={`${session?.userId ?? 'anonymous'}:${editingOfferId ?? 'new'}`} offerId={editingOfferId ?? undefined} session={session} restoring={restoring} onSessionChange={setSession} onProfileLoad={updateAccountName} onCreated={navigate} /> : isMyOffers ? <MyOffersPage key={session?.userId ?? 'anonymous'} session={session} restoring={restoring} onSessionChange={setSession} onProfileLoad={updateAccountName} /> : <>
      {isAdminArea ? (
        session?.userType === 'ADMIN' && !restoring ? <Suspense fallback={<main id="main-content" className="container account-status" role="status">Carregando área administrativa…</main>}><AdminPage key={session.userId + pathname + window.location.search} pathname={pathname} auth={withSession} session={session}
          onNameSaved={name => setSession(current => current?.userType === 'ADMIN' && current.userId === session.userId ? { ...current, name } : current)} /></Suspense> :
        <main id="main-content" className="account-main">
          {restoring ? (
            <section className="container account-status" role="status"><h1>Carregando área administrativa...</h1></section>
          ) : (
            <section className="container account-status" role="alert">
              <h1>Acesso restrito</h1>
              <p>Esta área é exclusiva para contas administrativas.</p>
              <a className="button button-primary" href={`/entrar?acesso=admin&returnTo=${encodeURIComponent(pathname)}`}>Entrar como equipe</a>
            </section>
          )}
        </main>
      ) : isMarketplace ? <MarketplacePage profileState={accountIdentity.id === sessionUserId ? accountIdentity.state : undefined} /> : offerId ? <OfferPage key={offerId} offerId={offerId} session={session} auth={withSession} restoring={restoring} navigate={navigate} /> : isProducts ? <ProductsPage key={window.location.search} /> : producerId ? <ProducerProfilePage key={producerId} producerId={producerId} auth={withSession} session={session} restoring={restoring} /> : isProducers ? <ProducersPage /> : isLogin ? (session && !(staffLogin && session.userType !== 'ADMIN') ? null : <LoginPage restoring={restoring} onSessionChange={value => { setRestoreError(''); setSession(value) }} returnTo={returnAfterAuth ?? undefined} />) : isRegister ? <RegisterPage returnTo={returnAfterAuth ?? undefined} /> : isAccount ? <AccountPage key={session?.userId ?? 'anonymous'} session={session} restoring={restoring} onSessionChange={setSession} onProfileLoad={updateAccountName} /> : (
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
