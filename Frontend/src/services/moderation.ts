import { apiBaseUrl } from './api'

export type Authorized = <T>(request: (token: string) => Promise<T>) => Promise<T>
export type Counts = Record<string, number>
export type Summary = { emailConfigured: boolean; offers: Counts; accounts: Counts; reports: Counts; team: Counts }
export type Options = { categories: string[]; actions: string[]; actors: { id: string; name: string }[] }
export type OfferRow = { id: string; code: string; title: string; description: string; producer: string; accountId: string; accountStatus: string; type: string; location: string; price: string; weight: string; status: string; openReports: number; totalReports: number }
export type AccountRow = { id: string; code: string; name: string; email: string; document: string; profile: string; status: string; verified: boolean; location: string; phone: string; createdAt: string; activeOffers: number }
export type ReportRow = { id: string; code: string; category: string; status: string; narrative: string; createdAt: string; reporter: string; assignee: string | null; offerId: string | null; offerTitle: string | null; accountId: string; accountName: string; priority: boolean; reportCount: number; files: { id: string; name: string }[] }
export type HistoryRow = { id: string; actor: string; action: string; reference: string; reason: string; justification: string; note: string | null; createdAt: string }
export type OverviewData = {
  highPriorityReports: number
  accounts: { newAccounts: number; producers: number; verified: number } | null
  offers: { total: number; clean: number }
  reviews: { total: number; onTime: number }
  pendingReports: Pick<ReportRow, 'id' | 'code' | 'category' | 'status' | 'accountName' | 'offerTitle' | 'priority' | 'createdAt'>[]
}
export type ReportContext = { decision: Omit<HistoryRow,'reference'|'id'> | null; offer: OfferRow | null; account: Pick<AccountRow,'name'|'profile'|'status'|'location'|'activeOffers'|'code'> | null }
export type Member = { id: string; name: string; email: string; role: string; active: boolean }
export type Page<T> = { rows: T[]; total: number; page: number }
export type Filters = Record<string,string>
export const adminApi = '/admin/moderation'
export const labels: Record<string,string> = {
  ATIVO:'Ativa', PAUSADO:'Pausada', REVIEW:'Em análise', DISABLED:'Desativada', RASCUNHO:'Rascunho', VENDIDO:'Vendida', EXPIRADO:'Expirada', CANCELADO:'Cancelada',
  ACTIVE:'Ativa', SUSPENDED:'Suspensa', BANNED:'Banida', OPEN:'Aberta', RESOLVED:'Resolvida', BUYER:'Comprador', PRODUCER:'Produtor', PRIORITY:'Alta prioridade',
}
export const dateText = (value: string, time = false) => new Date(value).toLocaleString('pt-BR', { dateStyle:'short', ...(time && { timeStyle:'short' as const }) })
export const refCode = (prefix: string, id: string) => prefix + '-' + id.slice(0,8).toUpperCase()
export const listPath = (section: string, filters: Filters, page = 1, size = 6) =>
  adminApi + '/lists/' + section + '?' + new URLSearchParams({ ...filters,page:String(page),size:String(size) })
export async function authorizedFetch(token: string, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
  if (!apiBaseUrl) throw new Error('A API está indisponível.')
  const response = await fetch(apiBaseUrl.replace(/\/+$/,'') + path, {
    method,
    headers: { Authorization:'Bearer ' + token, ...(body !== undefined && { 'Content-Type':'application/json' }) },
    ...(body !== undefined && { body:JSON.stringify(body) }), signal:AbortSignal.timeout(30000),
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou. Entre novamente.')
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Não foi possível concluir a operação.')
  }
  return response
}
export async function request<T>(token: string, path: string, body?: unknown): Promise<T> {
  const response = await authorizedFetch(token,path,body)
  return response.status === 204 ? undefined as T : response.json()
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function csv(cells: (string | number)[][]) {
  const escape = (cell: string | number) => {
    const raw = String(cell)
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(raw) ? "'" + raw : raw
    return '"' + safe.replaceAll('"','""') + '"'
  }
  return new Blob(['\ufeff'+cells.map(row => row.map(escape).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'})
}
