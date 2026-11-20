import { useState } from 'react'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { request, type Authorized } from '../services/moderation'
import './ReportForm.css'

export function ReportForm({auth,offerId,accountId}:{auth:Authorized;offerId?:string;accountId?:string}) {
  const [open,setOpen]=useState(false)
  const [category,setCategory]=useState('')
  const [narrative,setNarrative]=useState('')
  const [files,setFiles]=useState<File[]>([])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [sent,setSent]=useState('')
  return <><button type="button" className="button button-secondary" onClick={()=>{setOpen(true);setError('');setSent('')}}><Icon name="flag"/>Denunciar {offerId?'oferta':'conta'}</button>
    {sent&&<small role="status">{sent}</small>}
    {open&&<Dialog className="report-form" titleId="report-title" busy={busy} onClose={()=>setOpen(false)}><h2 id="report-title">Denunciar {offerId?'oferta':'conta'}</h2>
    <form onSubmit={async e=>{
      e.preventDefault();if(busy)return
      setError('')
      if(!narrative.trim()){setError('Descreva o ocorrido.');return}
      if(files.length>2||files.some(f=>f.size>2*1024*1024)){setError('Selecione até dois arquivos de até 2 MB cada.');return}
      setBusy(true)
      try {
        const uploads=await Promise.all(files.map(f=>new Promise<{name:string;data:string}>((resolve,reject)=>{
          const reader=new FileReader();reader.onload=()=>resolve({name:f.name,data:String(reader.result).split(',')[1]});reader.onerror=()=>reject(new Error('Falha ao ler o anexo.'));reader.readAsDataURL(f)
        })))
        const result=await auth(token=>request<{id:string}>(token,'/users/reports',{category,narrative,offerId,accountId,files:uploads}))
        setOpen(false);setSent('Denúncia DN-'+String(result.id).padStart(4,'0')+' recebida.');setNarrative('');setCategory('');setFiles([])
      }catch(err){setError(err instanceof Error?err.message:'Não foi possível enviar a denúncia.')}finally{setBusy(false)}
    }}><label>Motivo *<select required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecione o motivo</option>{['Possível fraude','Preço divergente','Produto não entregue','Anúncio duplicado','Conteúdo inadequado','Outro'].map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Seu relato *<textarea required maxLength={2000} rows={4} value={narrative} onChange={e=>setNarrative(e.target.value)}/></label>
      <label>Anexos <small>Até dois arquivos PDF, PNG ou JPEG de até 2 MB cada.</small><input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
      {error&&<p role="alert">{error}</p>}<div><button type="button" className="button button-secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy?'Enviando…':'Enviar denúncia'}</button></div>
    </form></Dialog>}</>
}
