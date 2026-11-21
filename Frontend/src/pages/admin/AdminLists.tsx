import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { formatPrice } from '../../data/marketplace'
import { formatQuantity } from '../../data/offerUnits'
import { useModerationData } from '../../hooks/useModerationData'
import { csv, dateText, download, labels, listPath, request, type Authorized, type OfferRow, type AccountRow, type HistoryRow, type Page, type Options, type Summary, type Filters } from '../../services/moderation'
import { Badge, LoadState, Metrics, PageHeading, Pages, SelectFilter, Tabs } from './AdminShared'
import type { Decision } from './ModerationDialog'

type Section = 'offers'|'accounts'|'history'
type Row = OfferRow|AccountRow|HistoryRow
const titles = { offers:'Ofertas',accounts:'Contas',history:'Histórico de ações' }
const descriptions = { offers:'Gerencie a publicação e a segurança das ofertas do marketplace.',accounts:'Gerencie as contas de compradores e produtores.',history:'Consulte as decisões da equipe administrativa e os motivos de cada ação.' }
const columns = { offers:['Oferta','Produtor','Preço','Status','Denúncias','Ações'],accounts:['Conta','Perfil','Status','Cadastro','Verificação','Ações'],history:['Data e hora','Ação','Referência','Responsável','Justificativa'] }
const verification = (a:AccountRow) => a.status==='BANNED'?'Irregular':a.status==='PENDING'?'Em análise':a.verified?'Verificada':'Sem verificação'
const choice = (value:string):[string,string]=>[value,labels[value]]
const offerTabs:[string,string][]=[['','Todas as ofertas'],['ATIVO','Ativas'],['REVIEW','Em análise'],['PAUSADO','Pausadas'],['DISABLED','Desativadas']]
const accountTabs:[string,string][]=[['','Todas as contas'],['BUYER','Compradores'],['PRODUCER','Produtores'],['PENDING','Pendentes']]
function exportRow(row:Row) {
  if ('title' in row) return [row.code,row.title,row.producer,formatPrice(Number(row.price)),formatQuantity(Number(row.weight)),labels[row.status],row.openReports]
  if ('email' in row) return [row.code,row.name,row.email,labels[row.profile],labels[row.status],dateText(row.createdAt),verification(row)]
  return [dateText(row.createdAt,true),row.action,row.reference,row.actor,row.reason,row.justification,row.note ?? '']
}
const csvHeaders = {offers:['Código','Oferta','Produtor','Preço/kg','Quantidade','Status','Denúncias abertas'],accounts:['Código','Nome','E-mail','Perfil','Status','Cadastro','Verificação'],history:['Data e hora','Ação','Referência','Responsável','Motivo','Justificativa','Observação interna']}
type Props = {section:Section;auth:Authorized;superAdmin:boolean;summary:Summary;options:Options;version:number;reload:()=>void;decide:(d:Decision)=>void;team:()=>void}
export function AdminLists({section,auth,superAdmin,summary,options,version,reload,decide,team}:Props) {
  const [filters,setFilters]=useState<Filters>(()=> {
    const search=new URLSearchParams(window.location.search)
    const f:Filters=section==='history'?{days:search.has('accountId')?'':'7'}:{}
    for (const key of ['q','status','id','accountId']) if(search.get(key)) f[key]=search.get(key)!
    return f
  })
  const [page,setPage]=useState(1)
  const [more,setMore]=useState(false)
  const [detail,setDetail]=useState<AccountRow|OfferRow|null>(null)
  const [exporting,setExporting]=useState(false)
  const [error,setError]=useState('')
  const query=useModerationData<Page<Row>>(auth,listPath(section,filters,page),version)
  function filter(values:Filters) { setPage(1);setFilters(old=>({...old,...values,id:''})) }
  const offers=section==='offers', accounts=section==='accounts', history=section==='history'
  const counts=offers?summary.offers:summary.accounts
  const total=Object.values(counts).reduce((a,b)=>a+b,0)
  async function exportList() {
    setExporting(true);setError('')
    try {
      const rows:(string|number)[][]=[csvHeaders[section]]
      let index=1
      while (true) {
        const result=await auth(token=>request<Page<Row>>(token,listPath(section,filters,index,100)))
        rows.push(...result.rows.map(exportRow))
        if (!result.rows.length || index*100>=result.total) break
        index++
      }
      download(csv(rows),'redecamarao-'+({offers:'ofertas',accounts:'contas',history:'historico'}[section])+'.csv')
    } catch(e) {setError(e instanceof Error?e.message:'Falha na exportação.')} finally {setExporting(false)}
  }
  function decideOffer(row:OfferRow,action:Decision['action']) { decide({action,targetId:row.id,title:row.title,detail:[row.code,row.producer,formatQuantity(Number(row.weight))].join(' · ')}) }
  function decideAccount(row:AccountRow,action:Decision['action']) { setDetail(null);decide({action,targetId:row.id,title:row.name,detail:[row.code,labels[row.profile],row.activeOffers+' oferta(s) ativa(s)'].join(' · ')}) }
  function cells(row:Row) {
    if ('title' in row) return [
      <><button className="mod-name" onClick={()=>setDetail(row)}>{row.title}</button><small>{row.code} · {formatQuantity(Number(row.weight))}</small></>,
      row.producer,<strong>{formatPrice(Number(row.price))}/kg</strong>,<Badge status={row.status}/>,
      row.totalReports?<a className="mod-link" href={'/admin/denuncias?offerId='+row.id}>{row.openReports?row.openReports+' em aberto':'Resolvidas'}</a>:'Nenhuma',
      <div className="mod-row-actions">{row.status==='DISABLED'&&row.accountStatus!=='ACTIVE'?<small>Conta bloqueada</small>:<button onClick={()=>decideOffer(row,row.status==='DISABLED'?'enable':'disable')}>{row.status==='DISABLED'?'Reativar':'Desativar'}</button>}{superAdmin&&<button className="mod-danger-text" onClick={()=>decideOffer(row,'remove')}>Excluir</button>}</div>,
    ]
    if ('email' in row) return [
      <><strong>{row.name}</strong><small>{row.email}</small></>,labels[row.profile],<Badge status={row.status}/>,dateText(row.createdAt),verification(row),
      <div className="mod-row-actions"><button onClick={()=>setDetail(row)}>Ver conta</button>{row.status==='PENDING'?<button onClick={()=>setDetail(row)}>Analisar cadastro</button>:row.status==='BANNED'?<button onClick={()=>setDetail(row)}>Revisar banimento</button>:<button className="mod-danger-text" onClick={()=>decideAccount(row,'ban')}>Banir conta</button>}</div>,
    ]
    return [dateText(row.createdAt,true),<strong>{row.action}</strong>,row.reference,row.actor,<><strong>{row.reason}</strong><small>{row.justification}</small>{row.note&&<small>Observação interna · {row.note}</small>}</>]
  }
  const chosenAccountTab=filters.status==='PENDING'?'PENDING':filters.profile||''
  return <>
    <PageHeading title={titles[section]} description={descriptions[section]} action={<button className="button button-secondary" onClick={exportList} disabled={exporting}><Icon name="download"/>{exporting?'Exportando…':'Exportar relatório'}</button>}/>
    {history?<aside className="mod-notice"><strong>Histórico protegido contra alterações</strong><p>Cada registro inclui responsável, data, justificativa e referência da entidade afetada.</p></aside>:
      <Metrics items={offers?[['Total de ofertas',total],['Ativas',counts.ATIVO||0],['Em análise',counts.REVIEW||0],['Pausadas',counts.PAUSADO||0],['Desativadas',counts.DISABLED||0]]:
        [['Total de contas',total],['Ativas',counts.ACTIVE||0],['Pendentes',counts.PENDING||0],['Suspensas',counts.SUSPENDED||0],['Banidas',counts.BANNED||0]]}/>}
    <section className="mod-panel mod-list" aria-label={titles[section]}>
      {!history&&<Tabs items={offers?offerTabs:accountTabs} value={offers?filters.status||'':chosenAccountTab} change={v=>filter(offers?{status:v}:{profile:v==='PENDING'?'':v,status:v==='PENDING'?'PENDING':''})}/>}
      <div className="mod-toolbar">
        {history&&<><SelectFilter label="Período" value={filters.days} change={days=>filter({days})} options={[['7','Últimos 7 dias'],['30','Últimos 30 dias'],['90','Últimos 90 dias'],['','Todo o período']]}/>
          <SelectFilter label="Ação" value={filters.action||''} change={action=>filter({action})} options={[['','Todas as ações'],...options.actions.map((s):[string,string]=>[s,s])]}/>
          <SelectFilter label="Responsável" value={filters.actor||''} change={actor=>filter({actor})} options={[['','Todos os responsáveis'],...options.actors.map((a):[string,string]=>[a.id,a.name])]}/></>}
        <label className="mod-search"><Icon name="search"/><input type="search" aria-label="Buscar" placeholder={offers?'Buscar por título, código ou produtor':accounts?'Buscar por nome, e-mail ou CPF/CNPJ':'Buscar por código da conta ou oferta'} value={filters.q||''} onChange={e=>filter({q:e.target.value})}/></label>
        {offers&&<SelectFilter label="Categoria" value={filters.category||''} change={category=>filter({category})} options={[['','Categoria: todas'],...options.categories.map((s):[string,string]=>[s,s])]}/>}
        {accounts&&<SelectFilter label="Status" value={filters.status||''} change={status=>filter({status})} options={[['','Status: todos'],...['ACTIVE','PENDING','SUSPENDED','BANNED'].map(choice)]}/>}
        {!history&&<button className="button button-secondary" aria-expanded={more} onClick={()=>setMore(!more)}><Icon name="filters"/>Mais filtros</button>}
      </div>
      {history&&filters.accountId&&<p className="mod-toolbar">Histórico desta conta <button className="mod-link" onClick={()=>filter({accountId:''})}>Ver todas as contas</button></p>}
      {more&&<div className="mod-toolbar"><input aria-label="Localização" placeholder="Cidade ou estado" value={filters.location||''} onChange={e=>filter({location:e.target.value})}/>
        {offers&&<><SelectFilter label="Status da oferta" value={filters.status||''} change={status=>filter({status})} options={[['','Todos os status'],...['ATIVO','REVIEW','PAUSADO','DISABLED','VENDIDO','CANCELADO','EXPIRADO','RASCUNHO'].map(choice)]}/><label><input type="checkbox" checked={filters.reported==='true'} onChange={e=>filter({reported:String(e.target.checked)})}/> Com denúncias abertas</label></>}
        <button className="mod-link" onClick={()=>{setFilters({});setPage(1)}}>Limpar filtros</button></div>}
      {error&&<p role="alert" className="mod-error">{error}</p>}
      {query.data ? <><table className="mod-table"><thead><tr>{columns[section].map(c=><th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{query.data.rows.map(row=><tr key={row.id}>{cells(row).map((cell,i)=><td data-label={columns[section][i]} key={i}>{cell}</td>)}</tr>)}</tbody></table>
      {!query.data.rows.length&&<p className="mod-empty">Nenhum registro encontrado.</p>}<Pages page={query.data.page} size={6} total={query.data.total} noun={history?'registros':titles[section].toLowerCase()} change={setPage}/></>:<LoadState error={query.error} retry={reload}/>}
    </section>
    {history?<section className="mod-panel mod-security"><div><h2>Permissões e segurança</h2><p>Administradores gerenciam contas e exclusões. Moderadores analisam ofertas e denúncias.</p><small>Segunda etapa desativada · Acesso por senha · {summary.team.SUPER_ADMIN||0} administrador(es) · {summary.team.ADMIN||0} moderador(es)</small></div>{superAdmin&&<button className="button button-secondary" onClick={team}>Gerenciar equipe</button>}</section>:
    <aside className="mod-notice"><strong>{offers?'Moderação de ofertas':'Gestão de acesso com responsabilidade'}</strong><p>{offers?'A desativação retira a oferta do marketplace. Somente a administração pode reativá-la. O histórico permanece disponível após a exclusão.':'Banir uma conta bloqueia o acesso e desativa suas ofertas. O motivo é obrigatório e o titular recebe uma notificação.'}</p></aside>}
    {detail&&<Dialog className="mod-dialog" titleId="details-title" onClose={()=>setDetail(null)}><div className="mod-dialog-heading"><h2 id="details-title">{'name' in detail?detail.name:detail.title}</h2><button className="mod-icon" aria-label="Fechar" onClick={()=>setDetail(null)}><Icon name="close"/></button></div>
      <p>{detail.code} · <Badge status={detail.status}/></p>
      {'name' in detail?<><dl className="mod-facts">{[['Perfil',labels[detail.profile]],['E-mail',detail.email],['CPF/CNPJ',detail.document],['Contato',detail.phone],['Localização',detail.location],['Cadastro',dateText(detail.createdAt)],['Verificação',verification(detail)],['Ofertas ativas',detail.activeOffers]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>)}</dl>
      <div className="mod-actions">{detail.status==='PENDING'&&<button className="button button-primary" onClick={()=>decideAccount(detail,'approve')}>Aprovar cadastro</button>}
      {['BANNED','SUSPENDED'].includes(detail.status)&&<button className="button button-primary" onClick={()=>decideAccount(detail,'restore')}>Reativar conta</button>}
      {detail.status==='ACTIVE'&&<button className="button button-secondary" onClick={()=>decideAccount(detail,'suspend')}>Suspender conta</button>}
      {detail.status!=='BANNED'&&<button className="button mod-danger-button" onClick={()=>decideAccount(detail,'ban')}>Banir conta</button>}</div></>:<><p>{detail.description}</p><p>{detail.producer} · {detail.location} · {formatQuantity(Number(detail.weight))} · {formatPrice(Number(detail.price))}/kg</p></>}
    </Dialog>}
  </>
}
