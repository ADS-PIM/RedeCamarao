import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi, authorizedFetch, dateText, download, listPath, refCode, type Authorized, type Page, type ReportRow, type HistoryRow, type Summary, type ReportContext, labels } from '../../services/moderation'
import { Badge, LoadState, PageHeading, Pages, SelectFilter, Tabs } from './AdminShared'
import type { Decision } from './ModerationDialog'

type Props={auth:Authorized;superAdmin:boolean;summary:Summary;version:number;reload:()=>void;decide:(d:Decision)=>void}
function ReportDetail({r,auth,superAdmin,decide,version,reload}:Pick<Props,'auth'|'superAdmin'|'decide'|'version'|'reload'>&{r:ReportRow}) {
  const [note,setNote]=useState('')
  const [error,setError]=useState('')
  const [show,setShow]=useState<'offer'|'account'|null>(null)
  const related=useModerationData<Page<HistoryRow>>(auth,listPath('history',{accountId:r.accountId},1,3),version)
  const context=useModerationData<ReportContext>(auth,adminApi+'/reports/'+r.id+'/context',version)
  const offer = context.data?.offer
  const account = context.data?.account
  const decision = context.data?.decision
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
    <div className="mod-dialog-heading"><h2>{r.code} · {r.category}</h2>{r.priority&&<Badge status="PRIORITY"/>}</div>
    <p>Recebida em {dateText(r.createdAt,true)} · Responsável: {r.assignee||'A atribuir'}</p>
    <div className="mod-target"><strong>{r.offerTitle||r.accountName} · {r.offerId?refCode('OF',r.offerId):refCode('CT',r.accountId)}</strong><small>{r.accountName} · Conta {refCode('CT',r.accountId)}</small>
      <div className="mod-row-actions">{r.offerId&&<button onClick={()=>setShow('offer')}>Ver oferta ↗</button>}<button onClick={()=>setShow('account')}>Ver conta ↗</button></div>
    </div>
    <h3>Relato do denunciante</h3><blockquote>{r.narrative}</blockquote><small>{r.reporter} · {dateText(r.createdAt,true)}</small>
    {r.files.length>0&&<div className="mod-actions">{r.files.map(f=><button className="button button-secondary" key={f.id} onClick={()=>file(f.id,f.name)}><Icon name="download"/>{f.name}</button>)}</div>}
    {context.error && <LoadState error={context.error} retry={reload}/>}
    {r.status === 'RESOLVED' && decision && <section className="mod-target" aria-label="Decisão da denúncia">
      <h3>Decisão da denúncia</h3><strong>{decision.action}</strong><small>{decision.actor} · {dateText(decision.createdAt,true)}</small>
      <p>{decision.reason} · {decision.justification}</p>{decision.note && <p>Observação interna · {decision.note}</p>}
    </section>}
    <h3>Histórico relacionado</h3><p>{r.reportCount} {r.reportCount===1?'relato':'relatos'} sobre {r.offerId?'esta oferta':'esta conta'}.</p>
    <a className="mod-link" href={'/admin/historico?accountId='+encodeURIComponent(r.accountId)}>Ver histórico da conta</a>
    {related.data?.rows.map(h=><small key={h.id}>{dateText(h.createdAt,true)} · {h.action} · {h.justification}{h.note?' · Observação interna: '+h.note:''}</small>)}
    {related.error&&<p role="alert">{related.error}</p>}
    {r.status!=='RESOLVED'&&<><label htmlFor="report-note">Observação interna *</label><textarea id="report-note" maxLength={2000} rows={3} value={note} onChange={e=>{setNote(e.target.value);setError('')}} placeholder="Descreva a análise e o motivo da decisão para a equipe."/>
      <div className="mod-actions">{r.status==='OPEN'&&<button className="button button-secondary" onClick={()=>start('review')}>Iniciar análise</button>}
        <button className="button button-secondary" onClick={()=>start('archive')}>Arquivar denúncia</button>
        {offer&&offer.status!=='DISABLED'&&<button className="button button-warning" onClick={()=>start('disable')}>Desativar oferta</button>}
        {superAdmin&&account&&account.status!=='BANNED'&&<button className="button mod-danger-button" onClick={()=>start('ban')}>Banir conta</button>}</div>
      <small>A decisão exige confirmação. A observação interna fica disponível apenas para a equipe.</small></>}
    {error&&<p role="alert" className="mod-error">{error}</p>}
    {show&&<Dialog titleId="case-entity" className="mod-dialog" onClose={()=>setShow(null)}><div className="mod-dialog-heading"><h2 id="case-entity">{show==='offer'?r.offerTitle:r.accountName}</h2><button className="mod-icon" aria-label="Fechar" onClick={()=>setShow(null)}><Icon name="close"/></button></div>
      {show==='offer'?<><p>{refCode('OF',r.offerId!)} · {r.accountName}</p><p>{context.error || offer?.description || (context.data?'Publicação removida do marketplace.':'Carregando oferta…')}</p>{offer&&<p>{labels[offer.status]} · {offer.location} · {Number(offer.weight).toLocaleString('pt-BR')} kg · {Number(offer.price).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}/kg</p>}</>:<><p>{refCode('CT',r.accountId)}</p>{account?<><p>{labels[account.profile]} · {labels[account.status]} · {account.activeOffers} oferta(s) ativa(s)</p><p>{account.location}</p>{superAdmin&&<a className="button button-secondary" href={'/admin/contas?id='+r.accountId}>Gerenciar esta conta</a>}</>:<p>{context.error||(context.data?'Esta conta foi removida.':'Carregando conta…')}</p>}</>}</Dialog>}
  </article>
}
export function AdminReports({auth,superAdmin,summary,version,reload,decide}:Props) {
  const search=new URLSearchParams(window.location.search)
  const [reportId,setReportId]=useState(search.get('id')||'')
  const [offerId,setOfferId]=useState(search.get('offerId')||'')
  const [status,setStatus]=useState(reportId||offerId?'':search.get('status')==='PRIORITY'?'PRIORITY':'OPEN')
  const [sort,setSort]=useState('priority')
  const [page,setPage]=useState(1)
  const [selected,setSelected]=useState('')
  const [policy,setPolicy]=useState(false)
  const results=useModerationData<Page<ReportRow>>(auth,listPath('reports',{status,sort,offerId,id:reportId},page,5),version)
  const active=results.data?.rows.find(r=>r.id===selected)??results.data?.rows[0]
  const names:Record<string,string>={...(offerId?{'':'Todas'}:{}),OPEN:'Abertas',REVIEW:'Em análise',PRIORITY:'Prioritárias',RESOLVED:'Resolvidas'}
  const title=reportId?'Denúncia selecionada':status?'Denúncias '+names[status].toLowerCase():'Denúncias desta oferta'
  function changeQueue(next:string) {setStatus(next);setPage(1);setSelected('');setReportId('')}
  return <>
    <PageHeading title="Denúncias" description="Analise evidências e tome decisões para proteger a comunidade." action={<button className="button button-secondary" onClick={()=>setPolicy(true)}>Políticas de moderação</button>}/>
    <Tabs items={Object.entries(names).map(([s,name])=>[s,offerId||s==='PRIORITY'?name:name+'  '+(summary.reports[s]||0)])} value={status} change={changeQueue}/>
    <div className="mod-report-layout"><section className="mod-panel mod-queue"><h2>{title}</h2>
      {!reportId&&<SelectFilter label="Ordenar denúncias" value={sort} change={s=>{setSort(s);setPage(1)}} options={[['priority','Prioridade: mais alta primeiro'],['recent','Mais recentes primeiro']]}/>}
      {reportId&&<button className="mod-link" onClick={()=>changeQueue(offerId?'':'OPEN')}>Voltar à fila</button>}
      {offerId&&<button className="mod-link" onClick={()=>{setOfferId('');changeQueue('OPEN')}}>Limpar filtro de oferta</button>}
      {results.data?<>{results.data.rows.map(r=><button key={r.id} aria-pressed={active?.id===r.id} className="mod-case-card" onClick={()=>setSelected(r.id)}><strong>{r.category}</strong><small>{r.offerId?refCode('OF',r.offerId):refCode('CT',r.accountId)} · {dateText(r.createdAt,true)}</small><Badge status={r.priority?'PRIORITY':r.status}/></button>)}
        {!active&&<p className="mod-empty">Nenhuma denúncia nesta fila.</p>}<Pages page={results.data.page} size={5} total={results.data.total} noun="denúncias" change={setPage}/></>:<LoadState error={results.error} retry={reload}/>}
    </section>{active&&<ReportDetail key={active.id+active.status} r={active} {...{auth,superAdmin,version,decide,reload}}/>}</div>
    {policy&&<Dialog titleId="policy-title" className="mod-dialog" onClose={()=>setPolicy(false)}><h2 id="policy-title">Políticas de moderação</h2><p>Analise o relato, os anexos e o histórico da conta. Registre separadamente a observação interna e a justificativa que o titular receberá.</p><p>Arquive relatos sem elementos para intervenção. Desative a oferta quando a publicação precisar de correção. Encaminhe casos de fraude ou reincidência à administração para avaliação da conta.</p><button className="button button-secondary" onClick={()=>setPolicy(false)}>Fechar</button></Dialog>}
  </>
}
