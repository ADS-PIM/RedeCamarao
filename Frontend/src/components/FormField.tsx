import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Icon } from './Icon'
import './FormField.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: string
  error?: string
  valid?: boolean
  hint?: string
  wide?: boolean
  onChange: (value: string) => void
}

export function FormField({ label, error, valid, hint, wide, type = 'text', id, onChange, ...inputProps }: Props) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className={`form-field ${wide ? 'field-wide' : ''}`}>
      <label htmlFor={id}>{label}{inputProps.required ? ' *' : ''}</label>
      <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
        <input {...inputProps} id={id} type={isPassword && visible ? 'text' : type} onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
        {isPassword ? (
          <button type="button" className="password-toggle" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name={visible ? 'eye-off' : 'eye'} /></button>
        ) : (error || valid) && <Icon className={`field-status ${error ? 'is-error' : 'is-valid'}`} name={error ? 'info' : 'check'} />}
      </div>
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  )
}
