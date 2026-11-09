type LinkClick = {
  button: number
  defaultPrevented: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

type LinkDestination = { href: string; target: string; download: boolean }

export function getInternalDestination(click: LinkClick, link: LinkDestination, currentHref: string): URL | null {
  if (click.defaultPrevented || click.button !== 0 || click.altKey || click.ctrlKey || click.metaKey || click.shiftKey) return null
  if (link.download || (link.target && link.target.toLowerCase() !== '_self')) return null

  try {
    const current = new URL(currentHref)
    const destination = new URL(link.href, current)
    return ['http:', 'https:'].includes(destination.protocol) && destination.origin === current.origin ? destination : null
  } catch {
    return null
  }
}
