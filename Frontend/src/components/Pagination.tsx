import { productPagination } from '../data/products'
import './Pagination.css'

export function Pagination({ currentPage, totalPages, onChange, label }: {
  currentPage: number; totalPages: number; onChange: (page: number) => void; label: string
}) {
  if (totalPages <= 1) return null
  return (
    <nav className="catalog-pagination" aria-label={label}>
      <button type="button" disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)}>Anterior</button>
      {productPagination(currentPage, totalPages).map((item, index) => item === 'ellipsis' ? <span className="catalog-pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
        : <button type="button" key={item} aria-label={`Página ${item}`} aria-current={currentPage === item ? 'page' : undefined} onClick={() => onChange(item)}>{item}</button>)}
      <button type="button" disabled={currentPage === totalPages} onClick={() => onChange(currentPage + 1)}>Próxima</button>
    </nav>
  )
}
