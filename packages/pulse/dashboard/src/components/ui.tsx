import {cva, type VariantProps} from 'class-variance-authority'
import {Search} from 'lucide-react'
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react'
import {cn} from '../lib/utils'

const buttonVariants = cva(
  'inline-flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] px-3 text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]',
        outline:
          'border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)] hover:bg-[var(--surface-hover)]',
        ghost:
          'bg-transparent px-3 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
        icon: 'relative size-9 border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
      },
    },
    defaultVariants: {variant: 'default'},
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, type = 'button', ...props}, reference) => (
    <button
      ref={reference}
      type={type}
      className={cn(buttonVariants({variant}), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export function Card({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn('rounded-lg border border-[var(--border)] bg-[var(--surface)]', className)}
      {...props}
    />
  )
}

export function Badge({className, ...props}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        className,
      )}
      {...props}
    />
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({className, ...props}, reference) => (
    <input
      ref={reference}
      className={cn(
        'h-9 w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 text-base text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-[var(--focus)] sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({className, ...props}, reference) => (
    <select
      ref={reference}
      className={cn(
        'h-9 rounded-md border border-[var(--border)] bg-[var(--input)] px-3 text-base text-[var(--text)] outline-none focus-visible:-outline-offset-1 focus-visible:outline-2 focus-visible:outline-[var(--focus)] sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
)
Select.displayName = 'Select'

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <Input className="pl-9" {...props} />
    </div>
  )
}

export function Skeleton({className}: {className?: string}) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />
}
