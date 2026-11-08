import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { useEffect, useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { restoreSession } from './services/auth'
import type { UserSession } from './services/auth'
import { RegisterPage } from './pages/RegisterPage'
import { MarketplacePage } from './pages/MarketplacePage'
import './App.css'

function App() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  const isMarketplace = ['/', '/marketplace', '/marketplace/'].includes(window.location.pathname)
  const isRegister = ['/registro', '/registro/'].includes(window.location.pathname)
  const isLogin = ['/entrar', '/entrar/', '/login', '/login/'].includes(window.location.pathname)

  useEffect(() => {
    let active = true
    restoreSession().then(value => { if (active) setSession(value) })
      .catch(() => { /* An unavailable or expired session leaves the login form available. */ })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])

  return (
    <div className={`app-shell${isMarketplace ? ' marketplace-shell' : ''}`}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header authenticated={Boolean(session)} marketplace={isMarketplace} />
      {isMarketplace ? <MarketplacePage /> : isLogin ? <LoginPage session={session} restoring={restoring} onSessionChange={setSession} /> : isRegister ? <RegisterPage /> : (
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
