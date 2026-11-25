import { Icon, type IconName } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { adminApi, dateText, listPath, type Authorized, type HistoryRow, type OverviewData, type Page, type Summary } from '../../services/moderation'
import { Badge, LoadState, PageHeading } from './AdminShared'

const numberText = new Intl.NumberFormat('pt-BR')
const percentText = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, style: 'percent' })

function Indicator({ label, value, total }: { label: string; value: number; total: number }) {
  return <div className="mod-indicator">
    <div><span>{label}</span>{total > 0 && <strong>{percentText.format(value / total)}</strong>}</div>
    {total > 0 ? <progress aria-label={label} max={total} value={value} /> : <small>Sem registros para calcular</small>}
  </div>
}

type Stat = { label: string; value: number; url: string; icon: IconName; detail?: string }

export function AdminOverview({ summary, superAdmin, auth, version, reload }: {
  summary: Summary; superAdmin: boolean; auth: Authorized; version: number; reload: () => void
}) {
  const overview = useModerationData<OverviewData>(auth, adminApi + '/overview', version, true)
  const latest = useModerationData<Page<HistoryRow>>(auth, listPath('history', {}, 1, 4), version, true)
  const data = overview.data
  const accounts = data?.accounts
  const highPriority = data?.highPriorityReports ?? 0
  const stats: Stat[] = [
    { label: 'Ofertas ativas', value: summary.offers.ATIVO ?? 0, url: '/admin/ofertas?status=ATIVO', icon: 'box' },
    { label: 'Denúncias abertas', value: summary.reports.OPEN ?? 0, url: '/admin/denuncias', icon: 'flag', detail: `${numberText.format(summary.reports.REVIEW ?? 0)} em análise` },
  ]
  if (superAdmin) {
    stats.splice(1, 0, {
      label: 'Contas cadastradas', value: Object.values(summary.accounts).reduce((sum, count) => sum + count, 0), url: '/admin/contas', icon: 'people',
      detail: accounts ? `${numberText.format(accounts.newAccounts)} nos últimos 30 dias` : undefined,
    })
  }

  return <>
    <PageHeading title="Visão geral" description="Acompanhe a operação e veja o que precisa da sua atenção." />
    <section className="mod-overview" aria-label="Totais da operação">
      {stats.map(({ label, value, url, icon, detail }) => <a className="mod-panel mod-stat" href={url} key={label}>
        <span className="mod-stat-icon"><Icon name={icon} /></span><Icon name="arrow" className="mod-stat-arrow" />
        <span className="mod-stat-label">{label}</span>
        <strong>{numberText.format(value)}</strong>
        {detail && <small>{detail}</small>}
      </a>)}
    </section>
    {highPriority > 0 && <aside className="mod-notice mod-priority-alert" aria-labelledby="priority-alert-title">
      <Icon name="flag" />
      <div><strong id="priority-alert-title">{numberText.format(highPriority)} {highPriority === 1 ? 'denúncia precisa' : 'denúncias precisam'} de atenção prioritária</strong>
        <p>A fila reúne relatos de possível fraude e produto não entregue.</p></div>
      <a className="mod-link" href="/admin/denuncias?status=PRIORITY">Revisar denúncias <Icon name="arrow" /></a>
    </aside>}
    <div className="mod-overview-grid">
      <section className="mod-panel" aria-labelledby="priority-title">
        <div className="mod-dialog-heading"><h2 id="priority-title">Prioridades da operação</h2><a className="mod-link" href="/admin/denuncias">Ver denúncias <Icon name="arrow" /></a></div>
        {data ? data.pendingReports.length ? <ul className="mod-overview-list">
          {data.pendingReports.map(report => <li className="mod-member" key={'report-' + report.id}>
            <div><strong>{report.category}</strong><small>{report.code} · {report.offerTitle || report.accountName} · {dateText(report.createdAt, true)}</small></div>
            <div className="mod-overview-actions"><Badge status={report.priority ? 'PRIORITY' : report.status} />
              <a className="mod-link" href={'/admin/denuncias?id=' + encodeURIComponent(report.id)} aria-label={'Analisar denúncia ' + report.code}>Analisar <Icon name="arrow" /></a></div>
          </li>)}
        </ul> : <p className="mod-empty">Nenhuma pendência na fila de análise.</p> : <LoadState error={overview.error} retry={reload} />}
      </section>
      <section className="mod-panel" aria-labelledby="platform-title">
        <h2 id="platform-title">Resumo da plataforma</h2>
        {data ? <div className="mod-indicators">
          {accounts && <Indicator label="Produtores ativos verificados" value={accounts.verified} total={accounts.producers} />}
          <p className="mod-period"><Icon name="calendar" /> Últimos 30 dias</p>
          <Indicator label="Ofertas ativas sem denúncias no período" value={data.offers.clean} total={data.offers.total} />
          <Indicator label="Denúncias analisadas em até 24 h" value={data.reviews.onTime} total={data.reviews.total} />
          <small>O prazo é medido até a primeira ação registrada na denúncia.</small>
        </div> : <LoadState error={overview.error} retry={reload} />}
      </section>
    </div>
    <section className="mod-panel" aria-labelledby="latest-title">
      <div className="mod-dialog-heading"><h2 id="latest-title">Últimas ações da equipe</h2><a className="mod-link" href="/admin/historico?days=">Abrir histórico <Icon name="arrow" /></a></div>
      {latest.data ? latest.data.rows.length ? <ul className="mod-overview-list">
        {latest.data.rows.map(row => <li className="mod-member" key={row.id}>
          <div><strong>{row.action} · {row.reference}</strong><small>{row.reason}</small></div>
          <small>{row.actor} · {dateText(row.createdAt, true)}</small>
        </li>)}
      </ul> : <p className="mod-empty">As decisões da equipe aparecerão aqui.</p> : <LoadState error={latest.error} retry={reload} />}
    </section>
  </>
}
