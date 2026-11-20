import { useEffect, useState } from 'react'
import { request, type Authorized } from '../services/moderation'

export function useModerationData<T>(auth: Authorized, path: string, version = 0): {data?:T;error?:string} {
  const key = version + ':' + path
  const [result,setResult] = useState<{key:string;data?:T;error?:string}>()
  useEffect(() => {
    let active = true
    if (path) void auth(token => request<T>(token,path)).then(data => {
      if (active) setResult({key,data})
    }).catch(error => { if (active) setResult({key,error:error instanceof Error ? error.message : 'Falha ao carregar os dados.'}) })
    return () => { active=false }
  },[auth,key,path])
  return result?.key === key ? result : {}
}
