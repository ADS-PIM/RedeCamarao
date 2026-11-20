import { changeCatalogUnit, validateCatalogQuantity } from '../data/catalogFilters'
import type { CatalogSelection } from '../data/catalogFilters'
import type { WeightUnit } from '../data/offerUnits'
import './QuantityRangeFields.css'

export function QuantityRangeFields<T extends CatalogSelection>({ idPrefix, value, onChange }: {
  idPrefix: string; value: T; onChange: (value: T) => void
}) {
  const error = validateCatalogQuantity(value)
  return <div className="quantity-range">
    <div className="quantity-unit"><label htmlFor={`${idPrefix}-unit`}>Unidade do lote</label>
      <select id={`${idPrefix}-unit`} value={value.quantityUnit} onChange={event => onChange(changeCatalogUnit(value, event.target.value as WeightUnit))}>
        <option value="kg">Quilogramas (kg)</option><option value="g">Gramas (g)</option>
      </select>
    </div>
    <div className="quantity-limits">{(['minQuantity', 'maxQuantity'] as const).map(field => <div key={field}>
      <label htmlFor={`${idPrefix}-${field}`}>{field === 'minQuantity' ? 'Mínimo' : 'Máximo'} ({value.quantityUnit})</label>
      <input id={`${idPrefix}-${field}`} type="text" inputMode="decimal" maxLength={20} placeholder={field === 'minQuantity' ? 'Sem mínimo' : 'Sem máximo'} value={value[field]}
        aria-invalid={error?.field === field} aria-describedby={error ? `${idPrefix}-error` : undefined}
        onChange={event => onChange({ ...value, [field]: event.target.value })} />
    </div>)}</div>
    {error && <p className="quantity-error" id={`${idPrefix}-error`} role="alert">{error.message}</p>}
  </div>
}
