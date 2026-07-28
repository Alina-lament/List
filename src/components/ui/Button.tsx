import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const variantClass: Record<Variant, string> = {
  primary: 'bg-royal text-white hover:bg-royal-dark disabled:bg-ink-4 shadow-xs active:scale-[0.97]',
  ghost: 'text-ink-2 hover:bg-canvas-2 hover:text-ink disabled:text-ink-4',
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
      className={`rounded-xl font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:ring-offset-2 ${
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      } ${variantClass[variant]} ${className}`}
      {...rest}
    />
  )
})