import { Icon } from './Icon'
import { brazilianStates } from '../utils/registration'
import { filterProductOffers, getOfferSize, getOfferState, sizeOptions } from '../data/products'
import type { ProductFilters as Filters, SizeFilter } from '../data/products'
import { shrimpTypeOptions } from '../data/catalogFilters'
import { QuantityRangeFields } from './QuantityRangeFields'
import type { Offer } from '../data/marketplace'

type Props = {
  offers: Offer[]
  query: string
  applied: Filters
  value: Filters
  unavailable: boolean
  loading: boolean
  priceError: { field: 'minPrice' | 'maxPrice'; message: string } | null
  onChange: (value: Filters) => void
  onClear: () => void
}

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

export function ProductFilters({ offers, query, applied, value, unavailable, loading, priceError, onChange, onClear }: Props) {
  const states = new Map<string, number>()
  const sizes = new Map<SizeFilter, number>()
  filterProductOffers(offers, query, { ...applied, states: [] }).forEach(offer => {
    const state = getOfferState(offer.location)
    if (state) states.set(state, (states.get(state) ?? 0) + 1)
  })
  filterProductOffers(offers, query, { ...applied, sizes: [] }).forEach(offer => {
    const size = getOfferSize(offer.size)
    if (size) sizes.set(size, (sizes.get(size) ?? 0) + 1)
  })

  const count = (value: number | undefined) => unavailable ? '—' : value ?? 0
  return (
    <div id="product-filters" className="product-filters" role="group" aria-labelledby="filters-title">
      <div className="filter-heading">
        <h2 id="filters-title">Filtros</h2>
        <button type="button" className="filter-clear" onClick={onClear}>Limpar tudo</button>
      </div>
      <div className="filter-groups">
        <fieldset className="filter-group">
          <legend>Tipo de camarão</legend>
          <div className="filter-options">{shrimpTypeOptions.map(option => <label className="filter-option" key={option.id}>
            <input type="checkbox" checked={value.types.includes(option.id)} onChange={() => onChange({ ...value, types: toggle(value.types, option.id) })} /><span>{option.label}</span>
          </label>)}</div>
        </fieldset>
        <fieldset className="filter-group location-group">
          <legend>Localização</legend>
          <label className="filter-field" htmlFor="products-location">Cidade ou estado</label>
          <input id="products-location" type="search" placeholder="Ex.: Fortaleza, Ceará" value={value.location} onChange={event => onChange({ ...value, location: event.target.value })} />
          <p className="filter-subtitle" id="states-title">Estados</p>
          <details className={`products-state-picker${value.states.length ? ' has-selection' : ''}`}>
            <summary><span>{value.states.length ? `${value.states.length} ${value.states.length === 1 ? 'estado selecionado' : 'estados selecionados'}` : 'Todos os estados'}</span><Icon name="chevron" /></summary>
            <div className="filter-options state-options" role="group" aria-label="Escolha um ou mais estados">
              {brazilianStates.map(state => (
              <label className="filter-option" key={state.code}>
                <input type="checkbox" checked={value.states.includes(state.code)} onChange={() => onChange({ ...value, states: toggle(value.states, state.code) })} />
                <span>{state.name} ({state.code})</span><small>{count(states.get(state.code))}</small>
              </label>
            ))}
            </div>
          </details>
          {loading && <p className="filter-hint">Carregando a quantidade de ofertas por estado.</p>}
          {unavailable && <p className="filter-hint">As quantidades por estado estão indisponíveis.</p>}
        </fieldset>
        <fieldset className="filter-group">
          <legend>Faixa de preço / kg</legend>
          <div className="price-fields">
            {(['minPrice', 'maxPrice'] as const).map(field => (
              <div key={field}>
                <label className="filter-field" htmlFor={`products-${field}`}>{field === 'minPrice' ? 'Mínimo' : 'Máximo'}</label>
                <input id={`products-${field}`} type="text" inputMode="decimal" placeholder={field === 'minPrice' ? 'R$ 0' : 'R$ 100'} maxLength={18}
                  value={value[field]} aria-invalid={priceError?.field === field} aria-describedby={priceError ? 'products-price-error' : undefined}
                  onChange={event => onChange({ ...value, [field]: event.target.value })} />
              </div>
            ))}
          </div>
          {priceError && <p id="products-price-error" className="filter-error" role="alert">{priceError.message}</p>}
        </fieldset>
        <fieldset className="filter-group">
          <legend>Tamanho</legend>
          <div className="filter-options">
            {sizeOptions.map(option => (
              <label className="filter-option" key={option.id}>
                <input type="checkbox" checked={value.sizes.includes(option.id)} onChange={() => onChange({ ...value, sizes: toggle(value.sizes, option.id) })} />
                <span>{option.label}</span><small>{count(sizes.get(option.id))}</small>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="filter-group">
          <legend>Lote disponível</legend>
          <QuantityRangeFields idPrefix="products-lot" value={value} onChange={onChange} />
        </fieldset>
      </div>
    </div>
  )
}
