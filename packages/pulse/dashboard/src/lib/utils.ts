import {type ClassValue, clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
  }).format(value)
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('en-US', {style: 'percent', maximumFractionDigits: 1}).format(value)
}

export function formatDuration(milliseconds?: number) {
  if (milliseconds === undefined || milliseconds === null) return '—'
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} s`
  if (milliseconds < 3_600_000) return `${Math.round(milliseconds / 60_000)} min`
  if (milliseconds < 86_400_000) return `${(milliseconds / 3_600_000).toFixed(1)} h`
  return `${(milliseconds / 86_400_000).toFixed(1)} d`
}

export function formatDate(value?: string | Date) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function formatRelative(value?: string | Date) {
  if (!value) return '—'
  const milliseconds = Date.now() - new Date(value).getTime()
  const future = milliseconds < 0
  const absolute = Math.abs(milliseconds)
  const suffix = future ? 'from now' : 'ago'
  if (absolute < 5_000) return 'just now'
  if (absolute < 60_000) return `${Math.round(absolute / 1000)}s ${suffix}`
  if (absolute < 3_600_000) return `${Math.round(absolute / 60_000)}m ${suffix}`
  if (absolute < 86_400_000) return `${Math.round(absolute / 3_600_000)}h ${suffix}`
  return `${Math.round(absolute / 86_400_000)}d ${suffix}`
}

export function truncateId(value?: string, size = 8) {
  if (!value) return '—'
  return value.length > size * 2 + 1 ? `${value.slice(0, size)}…${value.slice(-size)}` : value
}
