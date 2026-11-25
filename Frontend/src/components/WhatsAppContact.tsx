import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { producerWhatsAppHref } from '../data/producers'
import { useAuthenticatedAction } from '../hooks/useAuthenticatedAction'
import { fetchProducerWhatsAppPhone } from '../services/producers'
import type { UserSession } from '../services/auth'
import './WhatsAppContact.css'

type Props = {
  producerId: string
  offerId?: string
  session: UserSession | null
  restoring: boolean
  onSessionChange: (session: UserSession | null) => void
  message?: string
  className: string
}

export function WhatsAppContact({ producerId, offerId, session, restoring, onSessionChange, message, className }: Props) {
  const [opening, setOpening] = useState(false)
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)
  const [feedback, setFeedback] = useState('')
  const pending = useRef(false)
  const withSession = useAuthenticatedAction(session, onSessionChange)
  const returnTo = window.location.pathname
  const loginHref = `/entrar?returnTo=${encodeURIComponent(returnTo)}`
  const registerHref = `/registro?returnTo=${encodeURIComponent(returnTo)}`

  async function openWhatsApp() {
    if (restoring || pending.current) return
    setShowAccountPrompt(false)
    setFeedback('')

    if (!session) {
      setShowAccountPrompt(true)
      return
    }
    if (session.userType === 'ADMIN') {
      setFeedback('O acesso aos contatos é exclusivo para contas de comprador ou produtor.')
      return
    }

    pending.current = true
    setOpening(true)
    let popup: Window | null = null
    try {
      popup = window.open('about:blank', '_blank')
      if (popup) popup.opener = null
    } catch { /* If popups are blocked, use the current tab after retrieving the contact. */ }

    try {
      const phone = await withSession(token => fetchProducerWhatsAppPhone(producerId, token, undefined, offerId))
      const href = producerWhatsAppHref(phone, message)
      if (!href) throw new Error('Este produtor ainda não informou um telefone válido para WhatsApp.')
      if (popup) popup.location.replace(href)
      else window.location.assign(href)
      setFeedback('Abrindo a conversa do WhatsApp.')
    } catch (error) {
      popup?.close()
      setFeedback(error instanceof Error ? error.message : 'Não foi possível abrir o WhatsApp. Tente novamente.')
    } finally {
      pending.current = false
      setOpening(false)
    }
  }

  return (
    <div className="whatsapp-contact">
      <button type="button" className={className} disabled={restoring || opening} onClick={openWhatsApp}>
        <Icon name="whatsapp" />{restoring ? 'Verificando acesso...' : opening ? 'Abrindo WhatsApp...' : 'Conversar pelo WhatsApp'}
      </button>
      {(showAccountPrompt || feedback) && <p className="whatsapp-contact-status" role="status">
        {showAccountPrompt ? <>Para acessar o WhatsApp do produtor, <a href={loginHref}>entre</a> ou <a href={registerHref}>crie uma conta</a>.</> : feedback}
      </p>}
    </div>
  )
}
