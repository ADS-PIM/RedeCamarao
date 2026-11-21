import { useState, type FormEvent } from 'react'
import { Dialog } from '../../components/Dialog'
import { FormField } from '../../components/FormField'
import { Icon } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi, request, type Authorized, type Member } from '../../services/moderation'
import { LoadState } from './AdminShared'

const newMember = (): Member => ({ id:'', name:'', email:'', role:'ADMIN', active:true })
export function TeamDialog({ auth, userId, onClose, reload }: {auth:Authorized; userId:string; onClose:()=>void; reload:()=>void}) {
  const [version,setVersion] = useState(0)
  const {data,error} = useModerationData<Member[]>(auth, '/admin/', version)
  const [member,setMember] = useState<Member|null>(null)
  const [reason,setReason] = useState('')
  const [password,setPassword] = useState('')
  const [busy,setBusy] = useState(false)
  const [feedback,setFeedback] = useState('')
  const [failure,setFailure] = useState('')
  function edit(value:Member|null) {
    setMember(value); setReason(''); setPassword(''); setFeedback(''); setFailure('')
  }
  async function save(event:FormEvent) {
    event.preventDefault()
    if (!member || busy) return
    if (!reason.trim() || !member.name.trim()) {setFailure('Preencha o nome e a justificativa.');return}
    setBusy(true);setFailure('')
    try {
      if (member.id) await auth(token => request(token, adminApi+'/team/'+member.id, { role:member.role,active:member.active,justification:reason.trim() }))
      else await auth(token => request(token, '/admin/register', { name:member.name.trim(),email:member.email.trim(),password,role:member.role,justification:reason.trim() }))
      const message = member.id ? 'Permissão atualizada.' : 'Membro cadastrado. O acesso está disponível com a senha informada.'
      edit(null);setFeedback(message);setVersion(v=>v+1);reload()
    } catch (err) {setFailure(err instanceof Error ? err.message : 'Não foi possível salvar o membro.')}
    finally {setBusy(false)}
  }
  return <Dialog titleId="team-heading" className="mod-dialog" busy={busy} onClose={onClose}>
    <div className="mod-dialog-heading"><h2 id="team-heading">{member ? member.id ? 'Editar acesso' : 'Adicionar membro' : 'Gerenciar equipe'}</h2>
      <button disabled={busy} className="mod-icon" aria-label="Fechar" onClick={onClose}><Icon name="close"/></button></div>
    {member ? <form onSubmit={save}>
      {member.id ? <strong>{member.name}</strong> : <>
        <label>Nome *<input required maxLength={255} value={member.name} onChange={e=>setMember({...member,name:e.target.value})}/></label>
        <label>E-mail *<input required type="email" maxLength={320} value={member.email} onChange={e=>setMember({...member,email:e.target.value})}/></label>
        <FormField id="team-password" label="Senha inicial" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={setPassword} hint="Use entre 8 e 72 caracteres."/>
      </>}
      <label>Função<select value={member.role} onChange={e=>setMember({...member,role:e.target.value})}><option value="ADMIN">Moderador</option><option value="SUPER_ADMIN">Administrador</option></select></label>
      {member.id && <label><input type="checkbox" checked={member.active} onChange={e=>setMember({...member,active:e.target.checked})}/> Acesso ativo</label>}
      <label>Justificativa *<textarea required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <div className="mod-actions"><button className="button button-secondary" type="button" disabled={busy} onClick={()=>edit(null)}>Cancelar</button>
        <button className="button button-primary" disabled={busy}>{busy ? 'Salvando…' : member.id ? 'Salvar permissão' : 'Cadastrar membro'}</button></div>
    </form> : !data ? <LoadState error={error} retry={()=>setVersion(v=>v+1)}/> : <>
      <button className="button button-primary" onClick={()=>edit(newMember())}><Icon name="plus"/>Adicionar membro</button>
      {data.map(m=><div className="mod-member" key={m.id}><div><strong>{m.name}</strong><small>{m.email}</small><small>{m.role==='SUPER_ADMIN'?'Administrador':'Moderador'} · {m.active?'Ativo':'Inativo'}</small></div>
      {m.id!==userId&&<button className="mod-link" onClick={()=>edit(m)}>Editar</button>}</div>)}</>}
    {failure&&<p role="alert" className="mod-error">{failure}</p>}{feedback&&<p role="status">{feedback}</p>}
  </Dialog>
}
