import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { FormField } from '../components/FormField'
import { Icon } from '../components/Icon'
import { Dialog } from '../components/Dialog'
import { ProductCard } from '../components/ProductCard'
import { editorPayload, initialEditorValues, validateEditor } from '../data/offerEditor'
import type { EditorPhoto, OfferEditorValues } from '../data/offerEditor'
import type { ManagedOffer } from '../services/account'
import { fetchMyOffers, fetchMyProfile, fetchEditorPhotos, saveEditedOffer } from '../services/account'
import type { UserSession } from '../services/auth'
import { useAuthenticatedAction } from '../hooks/useAuthenticatedAction'
import { brazilianStates } from '../utils/registration'
import { sizeOptions } from '../data/products'
import './OfferEditorPage.css'

export function OfferEditorPage({ offerId, session, restoring, onSessionChange, onProfileLoad }: {
  offerId: string; session: UserSession | null; restoring: boolean;
  onSessionChange: (session: UserSession | null) => void; onProfileLoad: (name: string) => void
}) {
  const [values, setValues] = useState<OfferEditorValues | null>(null)
  const [original, setOriginal] = useState<ManagedOffer | null>(null)
  const [photos, setPhotos] = useState<EditorPhoto[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [missing, setMissing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [errors, setErrors] = useState<ReturnType<typeof validateEditor>>({})
  const [feedback, setFeedback] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [reading, setReading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const pending = useRef(false)
  const action = useAuthenticatedAction(session, onSessionChange)

  useEffect(() => {
    document.title = 'Editar oferta | RedeCamarão'
    if (restoring || !session || session.userType !== 'PRODUCER') return
    let active = true
    Promise.resolve().then(async () => {
      setLoading(true); setLoadError(''); setMissing(false)
      const offers = await action(token => fetchMyOffers(token, session.userId))
      const offer = offers.find(item => item.id === offerId)
      if (!active) return
      if (!offer) { setMissing(true); return }
      const [currentPhotos, profile] = await Promise.all([action(token => fetchEditorPhotos(token, offerId)), action(fetchMyProfile)])
      if (active) {
        setOriginal(offer); setValues(initialEditorValues(offer)); setPhotos(currentPhotos)
        setName(profile.name); onProfileLoad(profile.name); setDirty(false)
      }
    }).catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar esta oferta.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [offerId, session?.userId, session?.userType, restoring, attempt, action, onProfileLoad])

  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const leave = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return
      const link = event.target.closest<HTMLAnchorElement>('a[href]')
      if (!link || link.target === '_blank' || link.origin !== window.location.origin) return
      if (!window.confirm('Sair sem salvar as alterações desta oferta?')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', leave, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', leave, true) }
  }, [dirty])

  function change<K extends keyof OfferEditorValues>(key: K, value: OfferEditorValues[K]) {
    setValues(current => current && ({ ...current, [key]: value })); setDirty(true); setSuccess('')
    setErrors(current => ({ ...current, [key]: undefined }))
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length || reading || saving) return
    setFeedback(''); setSuccess('')
    const selected = Array.from(files)
    if (fileInput.current) fileInput.current.value = ''
    if (selected.length + photos.length > 5) { setFeedback('Você pode adicionar até 5 fotos.'); return }
    if (selected.some(file => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 3 * 1024 * 1024)) { setFeedback('Escolha arquivos JPG ou PNG de até 3 MB cada.'); return }
    setReading(true)
    try {
      const additions = await Promise.all(selected.map(async file => {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Não foi possível ler a foto.')); reader.readAsDataURL(file)
        })
        const img = new Image(); img.src = data
        await img.decode().catch(() => { throw new Error('Uma das imagens está danificada. Escolha outra foto.') })
        return { key: crypto.randomUUID(), data, imageUrl: data, description: '' }
      }))
      setPhotos(current => [...current, ...additions]); setDirty(true)
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Não foi possível adicionar as fotos.') }
    finally { setReading(false); if (fileInput.current) fileInput.current.value = '' }
  }
  function makeCover(key: string) { setPhotos(current => [...current.filter(photo => photo.key === key), ...current.filter(photo => photo.key !== key)]); setDirty(true); setSuccess('') }

  async function save(publish: boolean) {
    if (!values || pending.current || reading) return
    const invalid = validateEditor(values)
    setErrors(invalid); setFeedback(''); setSuccess('')
    if (Object.keys(invalid).length) {
      setFeedback('Confira os campos destacados antes de salvar.')
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.offer-editor-main [aria-invalid="true"]')?.focus())
      return
    }
    if (photos.length > 5) { setFeedback('Remova as fotos excedentes para manter no máximo 5.'); return }
    pending.current = true; setSaving(true)
    try {
      const payload = editorPayload(values, photos, publish)
      const savedPhotos = await action(token => saveEditedOffer(token, offerId, payload))
      setPhotos(savedPhotos); setValues(current => current && ({ ...current, available: publish })); setDirty(false)
      setSuccess(publish ? 'Oferta salva e ativada. Ela será exibida durante o período de disponibilidade informado.' : 'Oferta salva como pausada. Ela não aparece no marketplace.')
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Não foi possível salvar esta oferta.') }
    finally { setSaving(false); pending.current = false }
  }

  const blocked = restoring || !session || session.userType !== 'PRODUCER' || loading || loadError || missing || !values || !original
  if (blocked) return <main id="main-content" className="offer-editor-main"><section className="container editor-state" role={loadError ? 'alert' : 'status'}>
    <Icon name={restoring || (session?.userType === 'PRODUCER' && loading) ? 'waves' : 'info'} />
    <h1>{restoring ? 'Carregando sua conta...' : !session ? 'Entre para editar suas ofertas' : session.userType !== 'PRODUCER' ? 'Área exclusiva do produtor' : loading ? 'Carregando oferta...' : loadError ? 'Não foi possível carregar a oferta' : 'Oferta não encontrada'}</h1>
    <p>{loadError || (missing ? 'Esta oferta não pertence à sua conta ou foi removida.' : 'Gerencie as ofertas da sua própria fazenda com sua conta de produtor.')}</p>
    {loadError && <button type="button" className="button button-secondary" onClick={() => setAttempt(current => current + 1)}>Tentar novamente</button>}
    {!session && !restoring ? <a className="button button-primary" href="/entrar">Entrar</a> : !loading && <a className="button button-secondary" href="/painel">Acessar painel</a>}
  </section></main>

  const checks = [
    { label: 'Pelo menos uma foto adicionada', done: photos.length > 0 },
    { label: 'Título com pelo menos 12 caracteres', done: values.title.trim().length >= 12 },
    { label: 'Preço e quantidades válidos', done: !['price', 'weight', 'minimumQuantity', 'maximumQuantity'].some(key => validateEditor(values)[key as keyof OfferEditorValues]) },
    { label: 'Descrição com pelo menos 80 caracteres', done: values.description.trim().length >= 80 },
    { label: 'Localização e período preenchidos', done: !['city', 'state', 'startDate', 'endDate'].some(key => validateEditor(values)[key as keyof OfferEditorValues]) },
  ]
  const completeness = checks.filter(check => check.done).length * 20
  const busy = saving || reading
  const field = (key: keyof Omit<OfferEditorValues, 'available' | 'state' | 'description' | 'type' | 'size'>, label: string, type = 'text', hint?: string) => <FormField id={`editor-${key}`} label={label} type={type} required value={values[key]} onChange={value => change(key, value)} error={errors[key]} hint={hint} disabled={busy} maxLength={type === 'date' ? undefined : key === 'city' ? 200 : key === 'title' ? 255 : 20} inputMode={['price', 'weight', 'minimumQuantity', 'maximumQuantity'].includes(key) ? 'decimal' : undefined} />
  const select = (key: 'type' | 'size' | 'state', label: string, options: { value: string; label: string }[]) => <div className="form-field"><label htmlFor={`editor-${key}`}>{label} *</label><select id={`editor-${key}`} disabled={busy} value={values[key]} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `editor-${key}-error` : undefined} onChange={event => change(key, event.target.value)}><option value="">Selecione</option>{values[key] && !options.some(option => option.value === values[key]) && <option value={values[key]}>{values[key]}</option>}{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{errors[key] && <p className="field-error" id={`editor-${key}-error`}>{errors[key]}</p>}</div>

  return <main id="main-content" className="offer-editor-main">
    <section className="editor-heading"><div className="container editor-heading-inner"><div><p className="editor-eyebrow">Minhas ofertas</p><h1>Editar oferta</h1><p>Atualize os dados e as fotos do seu lote.</p></div>
      <div className="editor-heading-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => void save(false)}>Salvar como pausada</button><button type="button" className="button button-secondary" disabled={busy} onClick={() => setPreview(true)}><Icon name="eye" />Visualizar</button><button type="submit" form="offer-editor-form" className="button button-primary" disabled={busy}>{saving ? 'Salvando...' : values.available ? 'Salvar e publicar' : 'Salvar alterações'}</button></div>
    </div></section>
    <div className="container editor-save-feedback" aria-live="polite">{feedback && <p className="editor-error" role="alert"><Icon name="info" />{feedback}</p>}{success && <p className="editor-success" role="status"><Icon name="check" />{success}</p>}</div>
    <div className="container editor-layout">
      <form id="offer-editor-form" noValidate onSubmit={(event: FormEvent) => { event.preventDefault(); void save(values.available) }}>
        <section className="editor-panel" aria-labelledby="editor-photos-title"><div className="editor-panel-heading"><div><h2 id="editor-photos-title">Fotos da oferta</h2><p>Adicione até 5 fotos. A primeira será a capa.</p></div><span className="editor-photo-count">{photos.length} de 5</span></div>
          <div className="editor-photos">{photos.map((photo, index) => <figure className={`editor-photo${index === 0 ? ' editor-photo-cover' : ''}`} key={photo.key}><img src={photo.imageUrl} alt={photo.description || `Foto ${index + 1} da oferta`} onError={event => { event.currentTarget.style.visibility = 'hidden'; event.currentTarget.parentElement?.classList.add('editor-photo-failed') }} /><figcaption><button type="button" disabled={busy} className={index === 0 ? 'is-cover' : ''} onClick={() => makeCover(photo.key)} aria-label={index === 0 ? 'Foto de capa' : `Usar foto ${index + 1} como capa`}>{index === 0 ? 'Capa' : 'Definir capa'}</button><button type="button" disabled={busy} aria-label={`Remover foto ${index + 1}`} title={`Remover foto ${index + 1}`} onClick={() => { setPhotos(current => current.filter(item => item.key !== photo.key)); setDirty(true); setSuccess('') }}><Icon name="trash" /><span className="visually-hidden">Remover</span></button></figcaption></figure>)}
          {photos.length < 5 && <button type="button" className="editor-add-photo" disabled={busy} onClick={() => fileInput.current?.click()}><span aria-hidden="true">+</span><strong>{reading ? 'Lendo fotos...' : 'Adicionar foto'}</strong><small>JPG ou PNG · até 3 MB</small></button>}</div>
          <input className="visually-hidden" ref={fileInput} type="file" tabIndex={-1} accept="image/jpeg,image/png" multiple aria-label="Selecionar fotos" onChange={event => void addPhotos(event.target.files)} />
          {photos.length === 0 && <p className="editor-photo-hint">Mostre o lote real para ajudar o comprador a conhecer sua oferta.</p>}
        </section>
        <section className="editor-panel" aria-labelledby="editor-info-title"><h2 id="editor-info-title">Informações principais</h2><div className="editor-fields"><div className="editor-field-wide">{field('title', 'Título da oferta', 'text', 'Seja direto: tipo de camarão, condição e quantidade.')}</div>
          <div className="form-field editor-field-wide"><label htmlFor="editor-description">Descrição *</label><textarea id="editor-description" rows={5} maxLength={1000} disabled={busy} value={values.description} aria-invalid={Boolean(errors.description)} aria-describedby="editor-description-help" onChange={event => change('description', event.target.value)} /><p id="editor-description-help" className={errors.description ? 'field-error' : 'field-hint'}>{errors.description || `${values.description.length}/1.000 caracteres. Descreva o lote e as condições de negociação.`}</p></div>
          {select('type', 'Tipo de camarão', ['Camarão cinza', 'Camarão branco'].map(value => ({ value, label: value })))}{select('size', 'Tamanho', sizeOptions.map(option => ({ value: option.label, label: option.label })))}
        </div></section>
        <section className="editor-panel" aria-labelledby="editor-price-title"><h2 id="editor-price-title">Preço e quantidade</h2><div className="editor-fields editor-price-fields">{field('price', 'Preço por kg (R$)', 'text', 'Ex.: 34,90')}{field('weight', 'Quantidade disponível (kg)')}{field('minimumQuantity', 'Quantidade mínima (kg)')}{field('maximumQuantity', 'Quantidade máxima (kg)')}</div>
          <div className="editor-fields">{field('city', 'Cidade')}{select('state', 'Estado', brazilianStates.map(state => ({ value: state.code, label: `${state.name} (${state.code})` })))}{field('startDate', 'Disponível a partir de', 'date')}{field('endDate', 'Disponível até', 'date', 'Após esta data, a oferta deixa de aparecer no marketplace.')}</div>
          <label className="editor-available"><input type="checkbox" checked={values.available} disabled={busy} onChange={event => change('available', event.target.checked)} /><span><strong>Oferta disponível para negociação</strong><small>Desmarque para salvar como pausada.</small></span></label>
        </section>
        <div className="editor-bottom-actions"><a className="button button-secondary" href="/painel#ofertas">Voltar às minhas ofertas</a><button type="submit" className="button button-primary" disabled={busy}>{saving ? 'Salvando...' : values.available ? 'Salvar e publicar' : 'Salvar alterações'}</button></div>
      </form>
      <aside className="editor-sidebar" aria-label="Orientações para o anúncio"><section className="editor-panel"><h2>Preenchimento do anúncio</h2><progress value={completeness} max={100} aria-label="Preenchimento do anúncio" /><strong className="editor-completeness">{completeness}% completo</strong><ul>{checks.map(check => <li key={check.label}><Icon name={check.done ? 'check' : 'info'} className={check.done ? 'editor-check-done' : ''} /><span>{check.label}</span></li>)}</ul></section>
        <section className="editor-panel"><h2>Antes de publicar</h2><ul><li><Icon name="info" /><span>Confirme se a quantidade e o período estão atualizados.</span></li><li><Icon name="info" /><span>Use fotos reais e uma descrição clara do lote.</span></li><li><Icon name="info" /><span>Combine os detalhes da negociação diretamente com o comprador.</span></li></ul></section>
        <p className="editor-note"><Icon name="info" />Os dados e as fotos só são alterados após salvar. Salvar como pausada retira a oferta do marketplace.</p>
      </aside>
    </div>
    {preview && <Dialog titleId="editor-preview-title" onClose={() => setPreview(false)}><div className="editor-preview-heading"><div><p className="editor-eyebrow">Prévia das alterações</p><h2 id="editor-preview-title">Sua oferta</h2></div><button type="button" className="button button-secondary" onClick={() => setPreview(false)} aria-label="Fechar prévia"><Icon name="close" /></button></div>
      <div className="editor-preview-card"><ProductCard offer={{ ...original, ...editorPayload(values, photos, values.available).offer, title: values.title || 'Título da oferta', price: Number.isFinite(editorPayload(values, photos, values.available).offer.price) ? editorPayload(values, photos, values.available).offer.price : 0 }} producerName={name} photo={photos[0]} preview available={values.available} /><p className="editor-note">Esta é uma prévia. As alterações ainda precisam ser salvas.</p></div>
    </Dialog>}
  </main>
}
