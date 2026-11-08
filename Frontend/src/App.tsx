import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { RegisterPage } from './pages/RegisterPage'
import './App.css'

function App() {
  const isRegister = ['/', '/registro', '/registro/'].includes(window.location.pathname)
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header />
      {isRegister ? <RegisterPage /> : (
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
