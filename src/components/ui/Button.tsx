import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const variantClass: Record<Variant, string> = {
  primary: 'bg-royal text-white hover:bg-royal-dark disabled:bg-ink-4',
  ghost: 'text-ink-2 hover:bg-canvas-2 disabled:text-ink-4',
  danger: 'text-prihigh hover:bg-prihigh/10 disabled:text-ink-4',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'ghost', size = 'md', className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-royal/40 ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'
      } ${variantClass[variant]} ${className}`}
      {...rest}
    />
  )
})