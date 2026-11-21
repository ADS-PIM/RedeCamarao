import { brandLogoUrl } from '../data/brand'

export function Brand() {
  return <img className="brand-logo" src={brandLogoUrl} width={2300} height={730} alt="" loading="eager" fetchPriority="high" decoding="sync" />
}
