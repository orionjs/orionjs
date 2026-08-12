import {
  Activity,
  Boxes,
  Database,
  History,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  Waypoints,
  X,
} from 'lucide-react'
import {type ReactNode, useState} from 'react'
import {cn, formatRelative} from '../lib/utils'
import type {HealthStatus, View} from '../types'
import {StatusBadge} from './StatusBadge'
import {Button} from './ui'

const navigation: Array<{id: View; label: string; description: string; icon: typeof Activity}> = [
  {id: 'overview', label: 'Overview', description: 'System pulse', icon: LayoutDashboard},
  {id: 'topology', label: 'Topology', description: 'Publishers & consumers', icon: Waypoints},
  {id: 'deliveries', label: 'Deliveries', description: 'Group state', icon: ListChecks},
  {id: 'history', label: 'Attempts', description: 'Execution history', icon: History},
  {id: 'events', label: 'Events', description: 'Published payloads', icon: Boxes},
  {id: 'subscriptions', label: 'Consumers', description: 'Offsets & leases', icon: Activity},
]

interface ShellProps {
  children: ReactNode
  view: View
  onViewChange(view: View): void
  live: boolean
  onLiveChange(value: boolean): void
  onRefresh(): void
  refreshing: boolean
  generatedAt?: string
  database?: string
  prefix?: string
  health?: HealthStatus
  theme: 'dark' | 'light'
  onThemeChange(): void
}

function PulseMark() {
  return (
    <div className="flex size-8 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-foreground)]">
      <Activity className="size-4" />
    </div>
  )
}

export function Shell({
  children,
  view,
  onViewChange,
  live,
  onLiveChange,
  onRefresh,
  refreshing,
  generatedAt,
  database,
  prefix,
  health,
  theme,
  onThemeChange,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const active = navigation.find(item => item.id === view) ?? navigation[0]

  return (
    <div className="isolate min-h-dvh bg-[var(--background)] text-[var(--text)] antialiased">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-[var(--border)] px-4">
          <PulseMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Pulse</p>
            <p className="truncate text-xs text-[var(--text-muted)]">MongoDB events</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
          <p className="px-2 py-2 text-xs font-medium text-[var(--text-muted)]">Monitoring</p>
          {navigation.map(item => {
            const Icon = item.icon
            const selected = item.id === view
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'bg-[var(--nav-active)] text-[var(--text-strong)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="size-4 shrink-0 text-[var(--text-muted)]" />
            <span className="truncate font-mono text-xs">{database ?? 'Connecting…'}</span>
            <span className="live-dot ml-auto size-2 shrink-0 rounded-full bg-[var(--success)]" />
          </div>
          <p className="truncate pl-6 pt-1 font-mono text-xs text-[var(--text-muted)]">
            {prefix ? `${prefix}.*` : '—'}
          </p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--header)] px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(value => !value)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate text-base font-semibold">{active.label}</h1>
              {health && <StatusBadge status={health} className="hidden sm:inline-flex" />}
              <p className="hidden truncate text-sm text-[var(--text-muted)] md:block">
                Updated {formatRelative(generatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onLiveChange(!live)}
              className={cn(
                'hidden h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm transition-colors hover:bg-[var(--surface-hover)] sm:flex',
                live ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  live ? 'live-dot bg-[var(--success)]' : 'bg-[var(--text-subtle)]',
                )}
              />
              {live ? 'Live' : 'Paused'}
            </button>
            <Button variant="icon" onClick={onRefresh} aria-label="Refresh data">
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            </Button>
            <Button variant="icon" onClick={onThemeChange} aria-label="Toggle color theme">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <nav
            className="fixed inset-x-0 top-14 z-20 grid gap-1 border-b border-[var(--border)] bg-[var(--sidebar)] p-3 shadow-md dark:shadow-none lg:hidden"
            aria-label="Mobile navigation"
          >
            {navigation.map(item => {
              const Icon = item.icon
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id)
                    setMobileOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-base sm:text-sm',
                    item.id === view
                      ? 'bg-[var(--nav-active)] text-[var(--text-strong)]'
                      : 'text-[var(--text-muted)]',
                  )}
                >
                  <Icon className="size-5 sm:size-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
