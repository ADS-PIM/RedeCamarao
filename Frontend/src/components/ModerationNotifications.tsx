import { useState } from 'react'
import { useModerationData } from '../hooks/useModerationData'
import { dateText, type Authorized } from '../services/moderation'

export function ModerationNotifications({auth}:{auth:Authorized}) {
  const [version,setVersion]=useState(0)
  const {data,error}=useModerationData<{id:string;message:string;createdAt:string}[]>(auth,'/users/me/notifications',version)
  if (error) return <p role="alert">{error} <button onClick={()=>setVersion(v=>v+1)}>Recarregar notificações</button></p>
  if (!data?.length) return null
  return <section className="account-offers"><h2>Notificações da administração</h2>{data.map(n=><article key={n.id}><small>{dateText(n.createdAt,true)}</small><p style={{whiteSpace:'pre-line'}}>{n.message}</p></article>)}</section>
}
