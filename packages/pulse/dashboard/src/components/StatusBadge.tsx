import {cn} from '../lib/utils'
import {Badge} from './ui'

const styles: Record<string, string> = {
  success: 'border-[var(--success-border)] bg-[var(--success-muted)] text-[var(--success)]',
  healthy: 'border-[var(--success-border)] bg-[var(--success-muted)] text-[var(--success)]',
  active: 'border-[var(--success-border)] bg-[var(--success-muted)] text-[var(--success)]',
  error: 'border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)]',
  critical: 'border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)]',
  expired: 'border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)]',
  attention: 'border-[var(--warning-border)] bg-[var(--warning-muted)] text-[var(--warning)]',
  pending: 'border-[var(--warning-border)] bg-[var(--warning-muted)] text-[var(--warning)]',
  queued: 'border-[var(--info-border)] bg-[var(--info-muted)] text-[var(--info)]',
  idle: 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)]',
}

export function StatusBadge({status, className}: {status?: string; className?: string}) {
  const normalized = status ?? 'idle'
  return (
    <Badge className={cn(styles[normalized] ?? styles.idle, className)}>
      <span className="capitalize">{normalized}</span>
    </Badge>
  )
}
