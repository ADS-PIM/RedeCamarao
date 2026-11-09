import { useEffect, useState } from 'react'
import type { Offer } from '../data/marketplace'
import { fetchMarketplaceOffers } from '../services/offers'

export function useMarketplaceOffers() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchMarketplaceOffers()
      .then(data => { if (active) setOffers(data) })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as ofertas.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  function reloadOffers() {
    setLoading(true)
    setError(null)
    setAttempt(value => value + 1)
  }

  return { offers, loading, error, reloadOffers }
}
