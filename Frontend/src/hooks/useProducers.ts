import { useEffect, useState } from 'react'
import type { Producer } from '../data/producers'
import { fetchProducers } from '../services/producers'

export function useProducers() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    fetchProducers().then(data => { if (active) setProducers(data) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os produtores.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  function reloadProducers() { setLoading(true); setError(null); setAttempt(value => value + 1) }
  return { producers, loading, error, reloadProducers }
}
