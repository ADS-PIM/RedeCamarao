import { useCallback, useEffect, useRef } from 'react'
import { restoreSession } from '../services/auth'
import type { UserSession } from '../services/auth'

export function useAuthenticatedAction(session: UserSession | null, onSessionChange: (session: UserSession | null) => void) {
  const current = useRef(session)
  useEffect(() => { current.current = session }, [session])
  return useCallback(async <T,>(action: (token: string) => Promise<T>): Promise<T> => {
    const identity = current.current
    if (!identity) throw new Error('Entre novamente para continuar.')
    try { return await action(identity.accessToken) }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes('sessão expirou')) throw error
      const renewed = await restoreSession()
      if (!renewed || renewed.userId !== identity.userId || renewed.userType !== identity.userType) {
        onSessionChange(null)
        throw new Error('Sua sessão expirou. Entre novamente para continuar.', { cause: error })
      }
      current.current = renewed
      onSessionChange(renewed)
      return action(renewed.accessToken)
    }
  }, [onSessionChange])
}
