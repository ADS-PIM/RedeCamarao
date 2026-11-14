import { useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import './ProfilePhotoEditor.css'

export function ProfilePhotoEditor({ src, onSave, fallback = 'farm' }: {
  src: string | null; onSave: (data: string | null) => Promise<void>; fallback?: IconName
}) {
  const [draft, setDraft] = useState<string | null | undefined>(undefined)
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const pending = useRef(false)
  const preview = draft === undefined ? src : draft
  const busy = saving || reading
  async function select(file: File | undefined) {
    if (input.current) input.current.value = ''
    if (!file || busy) return
    setError(''); setSuccess('')
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError('Escolha uma foto JPG ou PNG de até 3 MB.'); return
    }
    setReading(true)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Não foi possível ler esta foto.')); reader.readAsDataURL(file)
      })
      const image = new Image(); image.src = data
      await image.decode().catch(() => { throw new Error('A imagem está danificada. Escolha outra foto.') })
      setDraft(data)
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível abrir a foto.') }
    finally { setReading(false) }
  }
  async function save() {
    if (draft === undefined || pending.current || reading) return
    pending.current = true; setSaving(true); setError(''); setSuccess('')
    try {
      await onSave(draft)
      setSuccess(draft === null ? 'Foto de perfil removida.' : 'Foto de perfil atualizada.')
      setDraft(undefined)
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar sua foto.') }
    finally { pending.current = false; setSaving(false) }
  }
  return <div className="profile-photo-editor" role="group" aria-label="Foto de perfil">
    <Avatar className="account-photo-avatar" src={preview} alt={draft === undefined ? 'Foto atual de perfil' : 'Prévia da foto de perfil'} fallback={fallback} />
    <div className="profile-photo-content"><h3>Foto de perfil</h3><p>JPG ou PNG de até 3 MB. A imagem será exibida em formato circular.</p>
      <div className="profile-photo-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => input.current?.click()}><Icon name="images" />{reading ? 'Lendo foto...' : preview ? 'Trocar foto' : 'Adicionar foto'}</button>
        {preview && <button type="button" className="profile-photo-remove" disabled={busy} onClick={() => { setDraft(null); setError(''); setSuccess('') }}><Icon name="trash" />Remover foto</button>}
        {draft !== undefined && <><button type="button" className="button button-primary" disabled={busy} onClick={() => void save()}>{saving ? 'Salvando...' : 'Salvar foto'}</button><button type="button" className="profile-photo-cancel" disabled={busy} onClick={() => { setDraft(undefined); setError('') }}>Cancelar</button></>}
      </div>
      <input ref={input} className="visually-hidden" type="file" tabIndex={-1} accept="image/jpeg,image/png" aria-label="Selecionar foto de perfil" onChange={event => void select(event.target.files?.[0])} />
      {draft !== undefined && <p className="profile-photo-hint">{draft === null ? 'Salve para confirmar a remoção da foto atual.' : 'Prévia selecionada. Clique em Salvar foto para confirmar.'}</p>}
      {error && <p className="profile-photo-error" role="alert">{error}</p>}{success && <p className="profile-photo-success" role="status">{success}</p>}
    </div>
  </div>
}
