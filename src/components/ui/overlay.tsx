import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type OverlayProps = {
  open: boolean
  onClose?: () => void
  className?: string
}

export default function Overlay({ open, onClose, className }: OverlayProps) {
  // SSR guard
  if (typeof document === 'undefined') return null

  const base = className ?? 'fixed inset-0 bg-black z-20 lg:hidden transition-opacity duration-200'
  const classes = cn(base, open ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none')

  return createPortal(
    <div className={classes} onClick={() => onClose?.()} aria-hidden="true" />,
    document.body
  )
}
