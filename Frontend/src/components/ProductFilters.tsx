import type { FormEvent } from 'react'
import { brazilianStates } from '../utils/registration'
import { getOfferSize, getOfferState, getQuantityBand, quantityOptions, sizeOptions } from '../data/products'
import type { ProductFilters as Filters, QuantityFilter, SizeFilter } from '../data/products'
import type { Offer } from '../data/marketplace'

type Props = {
  offers: Offer[]
  value: Filters
  unavailable: boolean
  loading: boolean
  priceError: { field: 'minPrice' | 'maxPrice'; message: string } | null
  onChange: (value: Filters) => void
  onApply: (event: FormEvent<HTMLFormElement>) => void
  onClear: () => void
}

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

export function ProductFilters({ offers, value, unavailable, loading, priceError, onChange, onApply, onClear }: Props) {
  const states = new Map<string, number>()
  const sizes = new Map<SizeFilter, number>()
  const quantities = new Map<QuantityFilter, number>()
  offers.forEach(offer => {
    const state = getOfferState(offer.location)
    const size = getOfferSize(offer.size)
    const quantity = getQuantityBand(offer.weight)
    if (state) states.set(state, (states.get(state) ?? 0) + 1)
    if (size) sizes.set(size, (sizes.get(size) ?? 0) + 1)
    quantities.set(quantity, (quantities.get(quantity) ?? 0) + 1)
  })

  const count = (value: number | undefined) => unavailable ? '—' : value ?? 0
  return (
    <form id="product-filters" className="product-filters" onSubmit={onApply} aria-labelledby="filters-title" noValidate>
      <div className="filter-heading">
        <h2 id="filters-title">Filtros</h2>
        <button type="button" className="filter-clear" onClick={onClear}>Limpar tudo</button>
      </div>
      <div className="filter-groups">
        <fieldset className="filter-group location-group">
          <legend>Localização</legend>
          <label className="filter-field" htmlFor="products-location">Cidade ou estado</label>
          <input id="products-location" type="search" placeholder="Ex.: Ceará" value={value.location} onChange={event => onChange({ ...value, location: event.target.value })} />
          <p className="filter-subtitle" id="states-title">Estados</p>
          <div className="filter-options state-options" role="group" aria-labelledby="states-title">
            {brazilianStates.filter(state => states.has(state.code)).map(state => (
              <label className="filter-option" key={state.code}>
                <input type="checkbox" checked={value.states.includes(state.code)} onChange={() => onChange({ ...value, states: toggle(value.states, state.code) })} />
                <span>{state.name}</span><small>{count(states.get(state.code))}</small>
              </label>
            ))}
            {states.size === 0 && <p className="filter-hint">{loading ? 'Carregando regiões...' : unavailable ? 'Regiões indisponíveis no momento.' : 'As regiões aparecerão com as ofertas.'}</p>}
          </div>
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
          <legend>Quantidade disponível</legend>
          <div className="filter-options">
            {quantityOptions.map(option => (
              <label className="filter-option" key={option.id}>
                <input type="checkbox" checked={value.quantities.includes(option.id)} onChange={() => onChange({ ...value, quantities: toggle(value.quantities, option.id) })} />
                <span>{option.label}</span><small>{count(quantities.get(option.id))}</small>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <button type="submit" className="button button-primary apply-filters" disabled={loading}>Aplicar filtros</button>
    </form>
  )
}
