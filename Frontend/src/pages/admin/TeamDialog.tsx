import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi,request,type Authorized,type Member } from '../../services/moderation'
import { LoadState } from './AdminShared'

export function TeamDialog({auth,userId,onClose,reload}:{auth:Authorized;userId:string;onClose:()=>void;reload:()=>void}) {
  const [version,setVersion]=useState(0)
  const {data,error}=useModerationData<Member[]>(auth,'/admin/',version)
  const [member,setMember]=useState<Member|null>(null)
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false)
  const [feedback,setFeedback]=useState('')
  return <Dialog titleId="team-heading" className="mod-dialog" busy={busy} onClose={onClose}>
    <div className="mod-dialog-heading"><h2 id="team-heading">Gerenciar equipe</h2><button disabled={busy} className="mod-icon" aria-label="Fechar" onClick={onClose}><Icon name="close"/></button></div>
    {!data?<LoadState error={error} retry={()=>setVersion(v=>v+1)}/>:member?<form onSubmit={async e=>{
      e.preventDefault();if(busy||!reason.trim())return;setBusy(true);setFeedback('')
      try {await auth(t=>request(t,adminApi+'/team/'+member.id,{role:member.role,active:member.active,justification:reason}));setMember(null);setVersion(v=>v+1);reload();setFeedback('Permissão atualizada.')}
      catch(e){setFeedback(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}
    }}><strong>{member.name}</strong><label>Função<select value={member.role} onChange={e=>setMember({...member,role:e.target.value})}><option value="ADMIN">Moderador</option><option value="SUPER_ADMIN">Administrador</option></select></label>
    <label><input type="checkbox" checked={member.active} onChange={e=>setMember({...member,active:e.target.checked})}/> Acesso ativo</label>
    <label>Justificativa *<textarea required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <div className="mod-actions"><button className="button button-secondary" type="button" disabled={busy} onClick={()=>setMember(null)}>Cancelar</button><button className="button button-primary" disabled={busy}>Salvar permissão</button></div></form>:
    data.map(m=><div className="mod-member" key={m.id}><div><strong>{m.name}</strong><small>{m.role==='SUPER_ADMIN'?'Administrador':'Moderador'} · {m.active?'Ativo':'Inativo'}</small></div>{m.id!==userId&&<button className="mod-link" onClick={()=>{setMember(m);setReason('');setFeedback('')}}>Editar</button>}</div>)}
    {feedback&&<p role="status">{feedback}</p>}</Dialog>
}
