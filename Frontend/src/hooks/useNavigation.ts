import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { getInternalDestination } from '../utils/navigation'

type Navigation = { href: string; key: string; kind: 'initial' | 'push' | 'pop' }
type Position = { left: number; top: number }
const entryKey = 'redeCamaraoNavigationKey'
let entrySequence = 0

function newEntryKey() { return `${Date.now()}-${entrySequence++}` }

function readLocation(kind: Navigation['kind']): Navigation {
  let key = window.history.state?.[entryKey] as string | undefined
  if (!key) {
    key = newEntryKey()
    window.history.replaceState({ ...window.history.state, [entryKey]: key }, '')
  }
  return { href: window.location.href, key, kind }
}

function hashTarget(url: URL) {
  if (!url.hash) return null
  try { return document.getElementById(decodeURIComponent(url.hash.slice(1))) }
  catch { return null }
}

function revealDestination(url: URL, focus: boolean, position?: Position) {
  const target = hashTarget(url)
  if (position) window.scrollTo({ ...position, behavior: 'instant' })
  else if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
  else window.scrollTo({ left: 0, top: 0, behavior: 'instant' })

  if (focus) {
    const content = target ?? document.getElementById('main-content')
    if (content) {
      if (!content.hasAttribute('tabindex')) content.tabIndex = -1
      content.focus({ preventScroll: true })
    }
  }
}

export function useNavigation() {
  const [navigation, setNavigation] = useState(() => readLocation('initial'))
  const current = useRef(navigation)
  const positions = useRef(new Map<string, Position>())

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const handlePopState = () => {
      positions.current.set(current.current.key, { left: window.scrollX, top: window.scrollY })
      setNavigation(readLocation('pop'))
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.history.scrollRestoration = previousRestoration
    }
  }, [])

  useLayoutEffect(() => {
    current.current = navigation
    const url = new URL(navigation.href)
    if (navigation.kind === 'initial') {
      if (url.hash) revealDestination(url, false)
      return
    }
    const position = navigation.kind === 'pop' ? positions.current.get(navigation.key) : undefined
    revealDestination(url, true, position)
    if (!position || Math.abs(window.scrollY - position.top) < 1) return

    // A page that fetches its content may initially be shorter than its saved scroll position.
    const observer = new ResizeObserver(() => {
      window.scrollTo({ ...position, behavior: 'instant' })
      if (Math.abs(window.scrollY - position.top) < 1) stop()
    })
    const stop = () => {
      observer.disconnect()
      window.removeEventListener('wheel', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', stop)
    }
    observer.observe(document.getElementById('main-content') ?? document.body)
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('pointerdown', stop)
    window.addEventListener('keydown', stop)
    return stop
  }, [navigation])

  const navigate = useCallback((href: string) => {
    const destination = new URL(href, window.location.href)
    positions.current.set(current.current.key, { left: window.scrollX, top: window.scrollY })
    if (destination.href === window.location.href) { revealDestination(destination, true); return }
    const key = newEntryKey()
    window.history.pushState({ ...window.history.state, [entryKey]: key }, '', destination)
    setNavigation({ href: destination.href, key, kind: 'push' })
  }, [])

  function handleLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return
    const link = event.target.closest<HTMLAnchorElement>('a[href]')
    if (!link) return
    const destination = getInternalDestination(event, {
      href: link.href, target: link.target, download: link.hasAttribute('download'),
    }, window.location.href)
    if (!destination) return

    event.preventDefault()
    navigate(destination.href)
  }

  return { pathname: new URL(navigation.href).pathname, handleLinkClick, navigate }
}
