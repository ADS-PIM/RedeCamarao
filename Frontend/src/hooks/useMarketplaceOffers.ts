import { useEffect, useState } from 'react'
import type { Offer } from '../data/marketplace'
import { fetchMarketplaceOffers } from '../services/offers'
import type { MarketplaceList } from '../services/offers'

export function useMarketplaceOffers(list: MarketplaceList = 'recent') {
  const [result, setResult] = useState<{ list: MarketplaceList; attempt: number; offers: Offer[]; error: string | null } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchMarketplaceOffers(undefined, list)
      .then(offers => { if (active) setResult({ list, attempt, offers, error: null }) })
      .catch(reason => {
        if (active) setResult({ list, attempt, offers: [], error: reason instanceof Error ? reason.message : 'Não foi possível carregar as ofertas.' })
      })
    return () => { active = false }
  }, [attempt, list])

  function reloadOffers() {
    setAttempt(value => value + 1)
  }

  const current = result?.list === list && result.attempt === attempt ? result : null
  return { offers: current?.offers ?? [], loading: !current, error: current?.error ?? null, reloadOffers }
}
