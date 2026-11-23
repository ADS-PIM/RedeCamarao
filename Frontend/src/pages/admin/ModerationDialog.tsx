import { useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { Icon } from '../../components/Icon'
import { adminApi, request, type Authorized } from '../../services/moderation'

const definitions = {
  disable: ['Desativar oferta','A oferta sairá do marketplace imediatamente. Somente a administração poderá reativá-la.','Confirmar desativação','Informações inconsistentes'],
  enable: ['Reativar oferta','A oferta volta a seguir o status e o período de disponibilidade definidos pelo produtor.','Reativar oferta','Informações regularizadas'],
  remove: ['Excluir oferta','A publicação será removida permanentemente do marketplace.','Excluir oferta','Violação grave das políticas'],
  ban: ['Banir conta','O titular perderá o acesso à plataforma e todas as suas ofertas serão desativadas.','Banir conta','Fraude ou tentativa de golpe'],
  restore: ['Reativar conta','O bloqueio será removido. Cadastros que aguardavam aprovação voltarão à fila. As ofertas desativadas poderão ser revisadas individualmente.','Reativar conta','Revisão do bloqueio'],
  approve: ['Aprovar cadastro','O produtor poderá entrar e publicar ofertas no marketplace.','Aprovar cadastro','Cadastro verificado'],
  suspend: ['Suspender conta','O acesso será suspenso e as ofertas sairão do marketplace.','Suspender conta','Suspensão preventiva'],
  archive: ['Arquivar denúncia','A denúncia será encerrada e a decisão ficará disponível no histórico.','Arquivar denúncia','Análise concluída'],
  review: ['Iniciar análise','A denúncia entrará na sua fila de análise.','Iniciar análise','Triagem da denúncia'],
} as const
export type Decision = { action:keyof typeof definitions; targetId?:string; reportId?:string; note?:string; title:string; detail:string }
export function ModerationDialog({decision,auth,onClose,onSaved,emailConfigured}:{decision:Decision;emailConfigured:boolean;auth:Authorized;onClose:()=>void;onSaved:()=>void}) {
  const [title,description,submit,defaultReason] = definitions[decision.action]
  const actionStyle = {
    disable: 'button-warning', suspend: 'button-warning', remove: 'mod-danger-button', ban: 'mod-danger-button',
    enable: 'button-success', restore: 'button-success', approve: 'button-success',
    archive: 'button-primary', review: 'button-primary',
  } satisfies Record<Decision['action'], string>
  const word = decision.action === 'ban' ? 'BANIR' : decision.action === 'remove' ? 'EXCLUIR' : ''
  const [reason,setReason] = useState<string>(defaultReason)
  const [why,setWhy] = useState('')
  const [confirmation,setConfirmation] = useState('')
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const pending = useRef(false)
  return <Dialog titleId="decision-title" descriptionId="decision-description" className="mod-dialog" busy={busy} onClose={onClose}>
    <div className="mod-dialog-heading"><h2 id="decision-title">{title}?</h2><button type="button" className="mod-icon" onClick={onClose} disabled={busy} aria-label="Fechar"><Icon name="close"/></button></div>
    <p id="decision-description">{description}</p>
    <div className="mod-target"><strong>{decision.title}</strong><small>{decision.detail}</small></div>
    <form onSubmit={async event => {
      event.preventDefault()
      if (pending.current) return
      if (!why.trim() || word && confirmation !== word) { setError(word && confirmation !== word ? 'Digite '+word+' para confirmar.' : 'Informe a justificativa.'); return }
      pending.current=true; setBusy(true); setError('')
      try { await auth(token=>request(token,adminApi+'/actions',{action:decision.action,targetId:decision.targetId,reportId:decision.reportId,note:decision.note,reason,justification:why,confirmation})); onSaved() }
      catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar a decisão.') }
      finally { pending.current=false; setBusy(false) }
    }}>
      <label>Motivo *<select value={reason} onChange={e=>setReason(e.target.value)}>{[defaultReason,'Revisão de evidências','Outro motivo'].map(r=><option key={r}>{r}</option>)}</select></label>
      <label>Justificativa *<textarea required rows={4} maxLength={2000} value={why} onChange={e=>setWhy(e.target.value)} /></label>
      <small>{decision.action === 'review' ? 'O registro ficará disponível para a equipe.' : 'A justificativa será enviada ao titular e registrada no histórico.'}</small>
      {word && <label>Digite {word} para confirmar *<input required value={confirmation} autoComplete="off" onChange={e=>setConfirmation(e.target.value)} /></label>}
      {decision.action !== 'review' && <p className="mod-notice">{emailConfigured ? 'O aviso ficará na plataforma e será encaminhado por e-mail.' : 'O aviso ficará na plataforma. O e-mail ficará pendente até a configuração do envio.'}</p>}
      {decision.action === 'remove' && <p className="mod-warning">A exclusão é irreversível. O registro de auditoria será preservado.</p>}
      {error && <p role="alert" className="mod-error">{error}</p>}
      <div className="mod-actions"><button type="button" disabled={busy} className="button button-secondary" onClick={onClose}>Cancelar</button><button disabled={busy} className={'button '+actionStyle[decision.action]}>{busy?'Registrando…':submit}</button></div>
    </form>
  </Dialog>
}
