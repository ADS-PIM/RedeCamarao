import { useEffect, useState } from 'react'
import type { OfferDetail } from '../data/marketplace'
import { fetchOfferDetail } from '../services/offers'

export function useOfferDetail(id: string) {
  const [offer, setOffer] = useState<OfferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchOfferDetail(id)
      .then(data => { if (active) setOffer(data) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar esta oferta.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, attempt])

  function reloadOffer() { setLoading(true); setError(null); setAttempt(value => value + 1) }
  return { offer, loading, error, reloadOffer }
}
