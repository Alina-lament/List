import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className={`w-full ${width} rounded-2xl bg-canvas shadow-card-xl ring-1 ring-ink/5`}>
          <div className="flex items-center justify-between border-b border-canvas-3 px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-ink">{title}</DialogTitle>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-ink-3 transition-colors hover:bg-canvas-2 hover:text-ink"
              aria-label="关闭"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-canvas-3 bg-canvas-2 px-6 py-4 rounded-b-2xl">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}