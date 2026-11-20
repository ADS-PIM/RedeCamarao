import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { Pagination } from '../../components/Pagination'
import { labels } from '../../services/moderation'

export function PageHeading({title,description,action}:{title:string;description:string;action?:ReactNode}) {
  return <header className="mod-heading"><div><p className="mod-crumb">Área administrativa <span>/</span> {title}</p><h1>{title}</h1><p>{description}</p></div>{action}</header>
}
export function Metrics({items}:{items:[string,number][]}) {
  return <dl className="mod-metrics">{items.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value.toLocaleString('pt-BR')}</dd></div>)}</dl>
}
export function Badge({status}:{status:string}) { return <span className={'mod-badge s-'+status}>{labels[status] || status}</span> }
export function LoadState({error,retry}:{error?:string;retry:()=>void}) {
  return error ? <div role="alert" className="mod-empty"><Icon name="info"/><p>{error}</p><button className="button button-secondary" onClick={retry}>Tentar novamente</button></div>
    : <p className="mod-empty" role="status">Carregando dados…</p>
}
export function Pages({page,size,total,noun,change}:{page:number;size:number;total:number;noun:string;change:(p:number)=>void}) {
  return <div className="mod-pages"><small>{total ? 'Mostrando '+((page-1)*size+1)+'–'+Math.min(page*size,total)+' de '+total.toLocaleString('pt-BR')+' '+noun : '0 '+noun}</small><Pagination currentPage={page} totalPages={Math.ceil(total/size)} label={'Páginas de '+noun} onChange={change}/></div>
}
export function SelectFilter({label,value,change,options}:{label:string;value:string;change:(v:string)=>void;options:[string,string][]}) {
  return <select aria-label={label} value={value} onChange={e=>change(e.target.value)}>{options.map(([id,text])=><option key={id} value={id}>{text}</option>)}</select>
}
export function Tabs({items,value,change}:{items:[string,string][];value:string;change:(v:string)=>void}) {
  return <div className="mod-tabs" role="group" aria-label="Filtrar por grupo">{items.map(([key,name])=><button type="button" key={key} aria-pressed={key===value} onClick={()=>change(key)}>{name}</button>)}</div>
}
