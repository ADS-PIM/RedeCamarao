import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function Dialog({ titleId, onClose, busy = false, children }: {
  titleId: string; onClose: () => void; busy?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className="account-modal" aria-labelledby={titleId}
    onCancel={event => { if (busy) event.preventDefault() }}
    onClose={event => { if (!event.currentTarget.open) onClose() }}
    onClick={event => { if (event.target === event.currentTarget && !busy) {
      const box = event.currentTarget.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
    } }}>
    {children}
  </dialog>
}
