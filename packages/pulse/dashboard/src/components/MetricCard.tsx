import {ArrowDownRight, ArrowUpRight} from 'lucide-react'
import type {ReactNode} from 'react'
import {cn} from '../lib/utils'

interface MetricCardProps {
  label: string
  value: ReactNode
  helper: ReactNode
  className?: string
  trend?: {direction: 'up' | 'down'; label: string}
}

export function MetricCard({label, value, helper, className, trend}: MetricCardProps) {
  return (
    <div className={cn('min-w-0 p-4 sm:p-5', className)}>
      <p className="truncate text-base text-[var(--text-muted)] sm:text-sm">{label}</p>
      <div className="mt-2 truncate text-2xl font-semibold tracking-tight text-[var(--text-strong)] tabular-nums">
        {value}
      </div>
      <div className="mt-2 flex min-h-5 items-center gap-2 text-base text-[var(--text-muted)] sm:text-sm">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium',
              trend.direction === 'up' ? 'text-[var(--success)]' : 'text-[var(--danger)]',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {trend.label}
          </span>
        )}
        <span className="truncate">{helper}</span>
      </div>
    </div>
  )
}
