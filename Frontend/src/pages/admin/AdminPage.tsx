import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi, type Authorized, type Summary, type Options } from '../../services/moderation'
import type { UserSession } from '../../services/auth'
import { LoadState } from './AdminShared'
import { AdminOverview } from './AdminOverview'
import { AdminProfile } from './AdminProfile'
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
  {id:'profile',title:'Meu perfil',url:'/admin/perfil',icon:'shield'},
] as const satisfies readonly { id: string; title: string; url: string; icon: IconName }[]
export function AdminPage({pathname,auth,session,onNameSaved}:{pathname:string;auth:Authorized;session:UserSession;onNameSaved:(name:string)=>void}) {
  const [version,setVersion]=useState(0)
  const [decision,setDecision]=useState<Decision|null>(null)
  const [team,setTeam]=useState(false)
  const [success,setSuccess]=useState('')
  const [menuOpen,setMenuOpen]=useState(false)
  const superAdmin=session.role==='SUPER_ADMIN'
  const section=sections.find(s=>s.url===pathname.replace(/\/$/,''))
  const summary=useModerationData<Summary>(auth,section?.id==='profile'?'':adminApi+'/summary',version,true)
  const usesListFilters=section?.id==='offers'||section?.id==='history'||section?.id==='accounts'&&superAdmin
  const options=useModerationData<Options>(auth,usesListFilters?adminApi+'/filters':'',version,true)
  const reload=()=>setVersion(v=>v+1)
  const props={auth,superAdmin,version,reload,decide:(d:Decision)=>{setSuccess('');setDecision(d)}}
  const available=sections.filter(s=>superAdmin||s.id!=='accounts')
  return <main className="mod-layout container" id="main-content">
    <div className={'mod-sidebar'+(menuOpen?' is-open':'')}>
      <div className="mod-sidebar-heading">
        <Icon name="shield"/><strong>Administração</strong>
        <button type="button" className="mod-menu" aria-label={menuOpen?'Fechar menu administrativo':'Abrir menu administrativo'} aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={()=>setMenuOpen(open=>!open)}><Icon name={menuOpen?'close':'menu'}/></button>
      </div>
      <nav id="admin-navigation" className="mod-nav" aria-label="Administração">{available.map(s=><a key={s.id} href={s.url} aria-current={section?.id===s.id?'page':undefined} onClick={()=>setMenuOpen(false)}><Icon name={s.icon}/>{s.title}</a>)}</nav>
    </div>
    <div className="mod-content">{success&&<p className="mod-success" role="status"><Icon name="check"/>{success}</p>}
    {!section?<h1>Página não encontrada</h1>:section.id==='accounts'&&!superAdmin?<section className="mod-panel"><h1>Acesso restrito</h1><p>Somente administradores podem gerenciar contas.</p></section>:
    section.id==='profile'?<AdminProfile userId={session.userId} auth={auth} onNameSaved={onNameSaved}/>:
    !summary.data?<LoadState error={summary.error} retry={reload}/>:
    section.id==='overview'?<AdminOverview {...props} summary={summary.data}/>:section.id==='reports'?<AdminReports {...props} summary={summary.data}/>:
    options.data?<AdminLists key={section.id} {...props} section={section.id} summary={summary.data} options={options.data} team={()=>setTeam(true)}/>:
    <LoadState error={options.error} retry={reload}/>}
    </div>
    {decision&&<ModerationDialog emailConfigured={Boolean(summary.data?.emailConfigured)} decision={decision} auth={auth} onClose={()=>setDecision(null)} onSaved={()=>{setDecision(null);setSuccess('Decisão registrada no histórico.');reload()}}/>}
    {team&&<TeamDialog auth={auth} userId={session.userId} onClose={()=>setTeam(false)} reload={reload}/>}
  </main>
}
