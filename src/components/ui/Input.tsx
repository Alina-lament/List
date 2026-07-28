import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const baseClass =
  'w-full rounded-lg border border-canvas-3 bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={`${baseClass} ${className}`} {...rest} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return <textarea className={`${baseClass} ${className}`} rows={3} {...rest} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props
  return <select className={`${baseClass} ${className}`} {...rest} />
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-3">{label}</span>
      {children}
    </label>
  )
}