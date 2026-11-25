import { useRef, useState, type FormEvent } from 'react'
import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { useModerationData } from '../../hooks/useModerationData'
import { authorizedFetch, dateText, type Authorized } from '../../services/moderation'
import { LoadState } from './AdminShared'

type Profile = {
  name: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN'
  active: boolean
  createdAt: string
  profile_picture: string | null
}

export function AdminProfile({ userId, auth, onNameSaved }: { userId: string; auth: Authorized; onNameSaved: (name: string) => void }) {
  const path = '/admin/' + encodeURIComponent(userId)
  const [version, setVersion] = useState(0)
  const { data: profile, error } = useModerationData<Profile>(auth, path, version)
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    const name = draft?.trim()
    if (!name || pending.current) return
    pending.current = true
    setBusy(true)
    setSaveError('')
    try {
      await auth(token => authorizedFetch(token, path, { name }, 'PATCH'))
      onNameSaved(name)
      setDraft(null)
      setSuccess('Nome atualizado.')
      setVersion(value => value + 1)
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Não foi possível salvar o perfil.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return <>
    <header className="mod-heading"><h1>Meu perfil</h1></header>
    {profile ? <section className="mod-panel mod-profile" aria-label="Dados da conta">
      <div className="mod-profile-identity">
        <Avatar src={profile.profile_picture} fallback="shield" className="mod-profile-avatar" />
        <div><h2>{profile.name}</h2><p>{profile.role === 'SUPER_ADMIN' ? 'Administrador' : 'Moderador'}</p></div>
      </div>
      <dl className="mod-facts">
        <div><dt>E-mail</dt><dd>{profile.email}</dd></div>
        <div><dt>Cadastro</dt><dd>{dateText(profile.createdAt)}</dd></div>
        <div><dt>Situação da conta</dt><dd>{profile.active ? 'Ativa' : 'Inativa'}</dd></div>
      </dl>
      {draft === null ? <button className="button button-secondary" onClick={() => { setDraft(profile.name); setSuccess(''); setSaveError('') }}><Icon name="edit" />Editar nome</button>
        : <form onSubmit={save}>
          <label>Nome<input autoFocus required maxLength={255} autoComplete="name" value={draft} disabled={busy} onChange={event => setDraft(event.target.value)} /></label>
          <div className="mod-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => { setDraft(null); setSaveError('') }}>Cancelar</button>
            <button className="button button-success" disabled={busy || !draft.trim() || draft.trim() === profile.name}>{busy ? 'Salvando…' : 'Salvar nome'}</button></div>
        </form>}
      {success && <p role="status">{success}</p>}
      {saveError && <p role="alert">{saveError}</p>}
    </section> : <LoadState error={error} retry={() => setVersion(value => value + 1)} />}
  </>
}
