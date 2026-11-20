import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi, authorizedFetch, dateText, download, listPath, refCode, type Authorized, type Page, type ReportRow, type HistoryRow, type Summary, type OfferRow } from '../../services/moderation'
import { LoadState, PageHeading, Pages, SelectFilter, Tabs } from './AdminShared'
import type { Decision } from './ModerationDialog'

type Props={auth:Authorized;superAdmin:boolean;summary:Summary;version:number;reload:()=>void;decide:(d:Decision)=>void}
function ReportDetail({r,auth,superAdmin,decide,version}:Pick<Props,'auth'|'superAdmin'|'decide'|'version'>&{r:ReportRow}) {
  const [note,setNote]=useState('')
  const [error,setError]=useState('')
  const [show,setShow]=useState<'offer'|'account'|null>(null)
  const related=useModerationData<Page<HistoryRow>>(auth,listPath('history',{accountId:r.accountId},1,3),version)
  const offer=useModerationData<Page<OfferRow>>(auth,r.offerId?listPath('offers',{id:r.offerId}):'',version)
  function start(action:Decision['action']) {
    if(!note.trim()){setError('Descreva sua análise antes de continuar.');document.getElementById('report-note')?.focus();return}
    const isOffer=action==='disable', isAccount=action==='ban'
    decide({action,reportId:r.id,note,title:isOffer?r.offerTitle||'Oferta':isAccount?r.accountName:r.category,detail:isOffer&&r.offerId?refCode('OF',r.offerId)+' · '+r.accountName:isAccount?refCode('CT',r.accountId):r.code})
  }
  async function file(id:string,name:string) {
    try {const blob=await auth(async token=>(await authorizedFetch(token,adminApi+'/evidence/'+id)).blob());download(blob,name)}
    catch (e) {setError(e instanceof Error?e.message:'Falha ao baixar o anexo.')}
  }
  return <article className="mod-panel mod-case">
    <div className="mod-dialog-heading"><h2>{r.code} · {r.category}</h2>{r.priority&&<span className="mod-badge s-BANNED">Alta prioridade</span>}</div>
    <p>Recebida em {dateText(r.createdAt,true)} · Responsável: {r.assignee||'A atribuir'}</p>
    <div className="mod-target"><strong>{r.offerTitle||r.accountName} · {r.offerId?refCode('OF',r.offerId):refCode('CT',r.accountId)}</strong><small>{r.accountName} · Conta {refCode('CT',r.accountId)}</small>
      <div className="mod-row-actions">{r.offerId&&<button onClick={()=>setShow('offer')}>Ver oferta ↗</button>}{superAdmin?<a href={'/admin/contas?id='+r.accountId}>Ver conta ↗</a>:<button onClick={()=>setShow('account')}>Ver conta ↗</button>}</div>
    </div>
    <h3>Relato do denunciante</h3><blockquote>{r.narrative}</blockquote><small>{r.reporter} · {dateText(r.createdAt,true)}</small>
    {r.files.length>0&&<div className="mod-actions">{r.files.map(f=><button className="button button-secondary" key={f.id} onClick={()=>file(f.id,f.name)}><Icon name="download"/>{f.name}</button>)}</div>}
    <h3>Histórico relacionado</h3><p>{r.reportCount} relato(s) sobre {r.offerId?'esta oferta':'esta conta'}.</p>
    {related.data?.rows.map(h=><small key={h.id}>{dateText(h.createdAt,true)} · {h.action} · {h.justification}{h.note?' · Observação interna: '+h.note:''}</small>)}
    {related.error&&<p role="alert">{related.error}</p>}
    {r.status!=='RESOLVED'&&<><label htmlFor="report-note">Observação interna *</label><textarea id="report-note" maxLength={2000} rows={3} value={note} onChange={e=>{setNote(e.target.value);setError('')}} placeholder="Descreva a análise e o motivo da decisão para a equipe."/>
      <div className="mod-actions">{r.status==='OPEN'&&<button className="button button-secondary" onClick={()=>start('review')}>Iniciar análise</button>}
        <button className="button button-secondary" onClick={()=>start('archive')}>Arquivar denúncia</button>
        {offer.data?.rows[0]&&offer.data.rows[0].status!=='DISABLED'&&<button className="button button-primary" onClick={()=>start('disable')}>Desativar oferta</button>}
        {superAdmin&&<button className="button mod-danger-button" onClick={()=>start('ban')}>Banir conta</button>}</div>
      <small>A decisão exige confirmação. A observação interna fica disponível apenas para a equipe.</small></>}
    {error&&<p role="alert" className="mod-error">{error}</p>}
    {show&&<Dialog titleId="case-entity" className="mod-dialog" onClose={()=>setShow(null)}><div className="mod-dialog-heading"><h2 id="case-entity">{show==='offer'?r.offerTitle:r.accountName}</h2><button className="mod-icon" aria-label="Fechar" onClick={()=>setShow(null)}><Icon name="close"/></button></div>
      {show==='offer'?<><p>{refCode('OF',r.offerId!)} · {r.accountName}</p><p>{offer.error||offer.data?.rows[0]?.description||(offer.data?'Publicação removida do marketplace.':'Carregando oferta…')}</p></>:<p>Conta {refCode('CT',r.accountId)} · <a className="mod-link" href={'/produtores/'+r.accountId}>Ver perfil público</a></p>}</Dialog>}
  </article>
}
export function AdminReports({auth,superAdmin,summary,version,reload,decide}:Props) {
  const [status,setStatus]=useState('OPEN')
  const [sort,setSort]=useState('priority')
  const [page,setPage]=useState(1)
  const [selected,setSelected]=useState('')
  const [policy,setPolicy]=useState(false)
  const [offerId,setOfferId]=useState(new URLSearchParams(window.location.search).get('offerId')||'')
  const results=useModerationData<Page<ReportRow>>(auth,listPath('reports',{status,sort,offerId},page,5),version)
  const active=results.data?.rows.find(r=>r.id===selected)??results.data?.rows[0]
  const names:Record<string,string>={OPEN:'Abertas',REVIEW:'Em análise',RESOLVED:'Resolvidas'}
  return <>
    <PageHeading title="Denúncias" description="Analise evidências e tome decisões para proteger a comunidade." action={<button className="button button-secondary" onClick={()=>setPolicy(true)}>Políticas de moderação</button>}/>
    <Tabs items={Object.entries(names).map(([s,name])=>[s,name+'  '+(summary.reports[s]||0)])} value={status} change={s=>{setStatus(s);setPage(1);setSelected('')}}/>
    <div className="mod-report-layout"><section className="mod-panel mod-queue"><h2>Denúncias {names[status].toLowerCase()}</h2>
      <SelectFilter label="Ordenar denúncias" value={sort} change={s=>{setSort(s);setPage(1)}} options={[['priority','Prioridade: mais alta primeiro'],['recent','Mais recentes primeiro']]}/>
      {offerId&&<button className="mod-link" onClick={()=>{setOfferId('');setPage(1)}}>Limpar filtro de oferta</button>}
      {results.data?<>{results.data.rows.map(r=><button key={r.id} aria-pressed={active?.id===r.id} className="mod-case-card" onClick={()=>setSelected(r.id)}><strong>{r.category}</strong><small>{r.offerId?refCode('OF',r.offerId):refCode('CT',r.accountId)} · {dateText(r.createdAt,true)}</small><span className={'mod-badge '+(r.priority?'s-BANNED':'')}>{r.priority?'Alta prioridade':names[status]==='Abertas'?'Aguardando análise':names[status]}</span></button>)}
        {!active&&<p className="mod-empty">Nenhuma denúncia nesta fila.</p>}<Pages page={page} size={5} total={results.data.total} noun="denúncias" change={setPage}/></>:<LoadState error={results.error} retry={reload}/>}
    </section>{active&&<ReportDetail key={active.id+active.status} r={active} {...{auth,superAdmin,version,decide}}/>}</div>
    {policy&&<Dialog titleId="policy-title" className="mod-dialog" onClose={()=>setPolicy(false)}><h2 id="policy-title">Políticas de moderação</h2><p>Analise o relato, os anexos e o histórico da conta. Registre separadamente a observação interna e a justificativa que o titular receberá.</p><p>Arquive relatos sem elementos para intervenção. Desative a oferta quando a publicação precisar de correção. Encaminhe casos de fraude ou reincidência à administração para avaliação da conta.</p><button className="button button-secondary" onClick={()=>setPolicy(false)}>Fechar</button></Dialog>}
  </>
}
