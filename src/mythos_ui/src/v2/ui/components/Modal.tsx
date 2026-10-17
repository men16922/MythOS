// Mythos 2.0 — in-app modal (never window.confirm). Esc / backdrop click closes.
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './modal.css'

export interface ModalProps {
  title?: ReactNode
  children: ReactNode
  onClose: () => void
  /** Footer actions. */
  actions?: ReactNode
  wide?: boolean
  tone?: 'default' | 'danger'
  /** Opened from inside another modal: drawn above it, and Esc closes only this one. */
  nested?: boolean
}

export function Modal({ title, children, onClose, actions, wide, tone = 'default', nested }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // A nested modal mounts (and registers) before its parent's listener, so this keeps Esc to the top one.
        if (nested) e.stopImmediatePropagation()
        else e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, nested])
  return createPortal(
    <div className={`m2-modal-back${nested ? ' m2-modal-back--nested' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`m2-modal${wide ? ' m2-modal--wide' : ''} m2-modal--${tone}`} role="dialog" aria-modal="true">
        <button className="m2-iconbtn m2-modal__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        {title && <div className="m2-modal__title">{title}</div>}
        <div className="m2-modal__body">{children}</div>
        {actions && <div className="m2-modal__actions">{actions}</div>}
      </div>
    </div>,
    document.querySelector('.m2-app') ?? document.body,
  )
}
