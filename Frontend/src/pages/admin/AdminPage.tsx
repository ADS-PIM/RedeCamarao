import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi, dateText, listPath, type Authorized, type Summary, type Options, type Page, type HistoryRow } from '../../services/moderation'
import type { UserSession } from '../../services/auth'
import { PageHeading, LoadState } from './AdminShared'
import { AdminLists } from './AdminLists'
import { AdminReports } from './AdminReports'
import { ModerationDialog, type Decision } from './ModerationDialog'
import { TeamDialog } from './TeamDialog'
import './AdminPage.css'

const sections = [
  {id:'overview',title:'Visão geral',url:'/admin',icon:'grid'},
  {id:'offers',title:'Ofertas',url:'/admin/ofertas',icon:'box'},
  {id:'accounts',title:'Contas',url:'/admin/contas',icon:'people'},
  {id:'reports',title:'Denúncias',url:'/admin/denuncias',icon:'flag'},
  {id:'history',title:'Histórico de ações',url:'/admin/historico',icon:'clock'},
] as const

function Overview({summary,superAdmin,auth,version,reload}:{summary:Summary;superAdmin:boolean;auth:Authorized;version:number;reload:()=>void}) {
  const latest=useModerationData<Page<HistoryRow>>(auth,listPath('history',{},1,5),version)
  const cards:[string,number,string,IconName][]=[
    ['Ofertas ativas',summary.offers.ATIVO||0,'/admin/ofertas?status=ATIVO','box'],
    ['Denúncias abertas',summary.reports.OPEN||0,'/admin/denuncias','flag'],
    ...(superAdmin?[['Cadastros pendentes',summary.accounts.PENDING||0,'/admin/contas?status=PENDING','people'] as [string,number,string,IconName]]:[]),
    ['Ofertas desativadas',summary.offers.DISABLED||0,'/admin/ofertas?status=DISABLED','pause'],
  ]
  return <><PageHeading title="Visão geral" description="Acompanhe as publicações, as denúncias e as decisões da equipe."/>
    <div className="mod-overview">{cards.map(([name,count,url,icon])=><a className="mod-panel" href={url} key={name}><span className="mod-stat-icon"><Icon name={icon}/></span><span>{name}</span><strong>{count.toLocaleString('pt-BR')}</strong><Icon name="arrow"/></a>)}</div>
    <section className="mod-panel"><div className="mod-dialog-heading"><h2>Ações recentes</h2><a className="mod-link" href="/admin/historico">Ver histórico</a></div>
    {latest.data?latest.data.rows.length?latest.data.rows.map(r=><div className="mod-member" key={r.id}><div><strong>{r.action}</strong><small>{r.reference} · {r.actor}</small></div><small>{dateText(r.createdAt,true)}</small></div>):<p className="mod-empty">As decisões da equipe aparecerão aqui.</p>:<LoadState error={latest.error} retry={reload}/>}</section></>
}
export function AdminPage({pathname,auth,session}:{pathname:string;auth:Authorized;session:UserSession}) {
  const [version,setVersion]=useState(0)
  const [decision,setDecision]=useState<Decision|null>(null)
  const [team,setTeam]=useState(false)
  const [success,setSuccess]=useState('')
  const [expanded,setExpanded]=useState(false)
  const superAdmin=session.role==='SUPER_ADMIN'
  const section=sections.find(s=>s.url===pathname.replace(/\/$/,''))
  const summary=useModerationData<Summary>(auth,adminApi+'/summary',version)
  const options=useModerationData<Options>(auth,adminApi+'/filters',version)
  const reload=()=>setVersion(v=>v+1)
  const props={auth,superAdmin,version,reload,decide:(d:Decision)=>{setSuccess('');setDecision(d)}}
  const available=sections.filter(s=>superAdmin||s.id!=='accounts')
  return <main className="mod-layout container" id="main-content">
    <aside className={'mod-sidebar'+(expanded?' is-open':'')}><div className="mod-sidebar-brand"><span className="mod-shield"><Icon name="shield"/></span><div><strong>Administração</strong><small>{superAdmin?'Administrador':'Moderador'}</small></div>
    <button className="mod-menu" aria-expanded={expanded} aria-controls="admin-nav" aria-label="Opções administrativas" onClick={()=>setExpanded(!expanded)}><Icon name={expanded?'close':'menu'}/></button></div>
    <nav id="admin-nav" aria-label="Administração">{available.map(s=><a key={s.id} href={s.url} aria-current={section?.id===s.id?'page':undefined} onClick={()=>setExpanded(false)}><Icon name={s.icon}/>{s.title}</a>)}</nav></aside>
    <div className="mod-content">{success&&<p className="mod-success" role="status"><Icon name="check"/>{success}</p>}
    {!section?<h1>Página não encontrada</h1>:section.id==='accounts'&&!superAdmin?<section className="mod-panel"><h1>Acesso restrito</h1><p>Somente administradores podem gerenciar contas.</p></section>:
    !summary.data||!options.data?<LoadState error={summary.error||options.error} retry={reload}/>:
    section.id==='overview'?<Overview {...props} summary={summary.data}/>:section.id==='reports'?<AdminReports {...props} summary={summary.data}/>:
    <AdminLists key={section.id} {...props} section={section.id} summary={summary.data} options={options.data} team={()=>setTeam(true)}/>}
    </div>
    {decision&&<ModerationDialog decision={decision} auth={auth} onClose={()=>setDecision(null)} onSaved={()=>{setDecision(null);setSuccess('Decisão registrada no histórico.');reload()}}/>}
    {team&&<TeamDialog auth={auth} userId={session.userId} onClose={()=>setTeam(false)} reload={reload}/>}
  </main>
}
