import { useEffect, useState } from 'react'
import type { ProducerProfile } from '../data/producers'
import { fetchProducerProfile } from '../services/producers'

export function useProducerProfile(id: string) {
  const [profile, setProfile] = useState<ProducerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    fetchProducerProfile(id).then(data => { if (active) setProfile(data) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar este produtor.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, attempt])
  function reloadProfile() { setLoading(true); setError(null); setAttempt(value => value + 1) }
  return { profile, loading, error, reloadProfile }
}
