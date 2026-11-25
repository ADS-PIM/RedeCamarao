import { useEffect, useState } from 'react'
import type { Offer } from '../data/marketplace'
import { fetchMarketplaceOffers } from '../services/offers'
import type { MarketplaceList } from '../services/offers'

export function useMarketplaceOffers(list: MarketplaceList = 'recent', state = '') {
  const [result, setResult] = useState<{ list: MarketplaceList; state: string; attempt: number; offers: Offer[]; error: string | null; loadedAt: number } | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetchMarketplaceOffers(undefined, list, state)
      .then(offers => { if (active) setResult({ list, state, attempt, offers, error: null, loadedAt: Date.now() }) })
      .catch(reason => {
        if (active) setResult({ list, state, attempt, offers: [], loadedAt: 0, error: reason instanceof Error ? reason.message : 'Não foi possível carregar as ofertas.' })
      })
    return () => { active = false }
  }, [attempt, list, state])

  function reloadOffers() {
    setAttempt(value => value + 1)
  }

  const current = result?.list === list && result.state === state && result.attempt === attempt ? result : null
  return { offers: current?.offers ?? [], loadedAt: current?.loadedAt ?? 0, loading: !current, error: current?.error ?? null, reloadOffers }
}
