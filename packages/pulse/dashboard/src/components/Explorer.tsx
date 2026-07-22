import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChevronRight,
  CircleSlash2,
  History,
  ListChecks,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {apiGet} from '../lib/api'
import {formatDate, formatDuration, formatNumber, formatRelative, truncateId} from '../lib/utils'
import type {PagedData, PulseRecord, View} from '../types'
import {DetailDrawer} from './DetailDrawer'
import {StatusBadge} from './StatusBadge'
import {Button, Card, SearchInput, Select, Skeleton} from './ui'

const explorerConfig = {
  deliveries: {
    title: 'Deliveries',
    description: 'One logical delivery for every consumer group and event.',
    icon: ListChecks,
    endpoint: '/api/deliveries',
  },
  history: {
    title: 'Execution attempts',
    description: 'Every attempt, lock transition, duration and terminal error.',
    icon: History,
    endpoint: '/api/history',
  },
  events: {
    title: 'Published events',
    description: 'Immutable event payloads currently retained by MongoDB.',
    icon: Boxes,
    endpoint: '/api/events',
  },
  subscriptions: {
    title: 'Consumer subscriptions',
    description: 'Durable offsets, ordering policy and distributed lease state.',
    icon: Activity,
    endpoint: '/api/subscriptions',
  },
} as const

type ExplorerView = Exclude<View, 'overview'>

function RecordCells({view, record}: {view: ExplorerView; record: PulseRecord}) {
  if (view === 'deliveries') {
    return (
      <>
        <td className="px-4 py-3">
          <StatusBadge status={record.status} />
        </td>
        <td className="min-w-[250px] px-4 py-3">
          <p className="truncate font-mono text-sm font-medium text-[var(--text)]">
            {record.topic}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            {truncateId(record.eventId)}
          </p>
        </td>
        <td className="px-4 py-3 font-mono text-sm text-[var(--text-muted)]">
          {record.consumerGroup}
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm tabular-nums">
          {record.finalAttempt ?? '—'}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-muted)]">
          {formatRelative(record.updatedAt)}
        </td>
      </>
    )
  }
  if (view === 'history') {
    return (
      <>
        <td className="px-4 py-3">
          <StatusBadge status={record.status} />
        </td>
        <td className="min-w-[240px] px-4 py-3">
          <p className="truncate font-mono text-sm font-medium text-[var(--text)]">
            {record.topic}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {record.error?.message ?? truncateId(record.eventId)}
          </p>
        </td>
        <td className="px-4 py-3 font-mono text-sm text-[var(--text-muted)]">
          {record.consumerGroup}
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm tabular-nums">
          {record.attempt ?? '—'}
        </td>
        <td className="px-4 py-3">
          {record.lockState ? (
            <StatusBadge status={record.lockState} />
          ) : (
            <span className="text-[var(--text-subtle)]">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-[var(--text-muted)] tabular-nums">
          {formatDuration(record.durationMs)}
        </td>
      </>
    )
  }
  if (view === 'events') {
    return (
      <>
        <td className="min-w-[280px] px-4 py-3">
          <p className="truncate font-mono text-sm font-medium text-[var(--text)]">
            {record.topic}
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{truncateId(record.id)}</p>
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm text-[var(--warning)] tabular-nums">
          {record.deliveries?.pending ?? 0}
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm text-[var(--success)] tabular-nums">
          {record.deliveries?.success ?? 0}
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm text-[var(--danger)] tabular-nums">
          {record.deliveries?.error ?? 0}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-muted)]">
          {formatDate(record.createdAt)}
        </td>
      </>
    )
  }
  return (
    <>
      <td className="min-w-[220px] px-4 py-3">
        <p className="truncate font-mono text-sm font-medium text-[var(--text)]">{record.topic}</p>
        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{truncateId(record.id)}</p>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-[var(--text-muted)]">
        {record.consumerGroup}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={record.ordered ? 'active' : 'idle'} />
      </td>
      <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{record.delivery}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          <StatusBadge status={record.orderedLease} />
          <StatusBadge status={record.discoveryLease} />
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-muted)]">
        {formatDate(record.cursorCreatedAt)}
      </td>
    </>
  )
}

function TableHeader({view}: {view: ExplorerView}) {
  const headers =
    view === 'deliveries'
      ? ['Status', 'Topic / event', 'Consumer group', 'Attempt', 'Updated']
      : view === 'history'
        ? ['Status', 'Topic / error', 'Consumer group', 'Attempt', 'Lock', 'Duration']
        : view === 'events'
          ? ['Topic / event', 'Pending', 'Success', 'Errors', 'Published']
          : ['Topic', 'Consumer group', 'Ordered', 'Delivery', 'Leases', 'Cursor']
  return (
    <tr>
      {headers.map(header => (
        <th key={header} className="whitespace-nowrap px-4 py-2.5 text-left font-medium">
          {header}
        </th>
      ))}
      <th className="w-10 px-2">
        <span className="sr-only">Open</span>
      </th>
    </tr>
  )
}

interface ExplorerProps {
  view: ExplorerView
  live: boolean
  refreshSignal: number
  onRefreshing(value: boolean): void
}

export function Explorer({view, live, refreshSignal, onRefreshing}: ExplorerProps) {
  const config = explorerConfig[view]
  const Icon = config.icon
  const [data, setData] = useState<PagedData>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PulseRecord>()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [lockState, setLockState] = useState('')

  useEffect(() => {
    setPage(1)
    setSearch('')
    setStatus('')
    setLockState('')
    setSelected(undefined)
  }, [view])

  const parameters = useMemo(
    () => ({page, limit: 25, search, status, lockState}),
    [page, search, status, lockState],
  )
  const load = useCallback(async () => {
    setLoading(true)
    onRefreshing(true)
    try {
      const response = await apiGet<PagedData>(config.endpoint, parameters)
      setData(response.data)
      setError(undefined)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setLoading(false)
      onRefreshing(false)
    }
  }, [config.endpoint, parameters, onRefreshing])

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 180)
    return () => window.clearTimeout(timeout)
  }, [load, refreshSignal])
  useEffect(() => {
    if (!live) return
    const interval = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(interval)
  }, [live, load])

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setLockState('')
    setPage(1)
  }
  const hasFilters = Boolean(search || status || lockState)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold">{config.title}</h2>
          <p className="mt-1 max-w-[65ch] text-base text-[var(--text-muted)] sm:text-sm">
            {config.description}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold tabular-nums">
            {formatNumber(data?.pagination.total ?? 0)}
          </p>
          <p className="text-sm text-[var(--text-muted)]">Retained records</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--border)] p-3 sm:flex-row sm:items-center">
          <SearchInput
            name="search"
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={`Search ${view}…`}
            aria-label={`Search ${view}`}
          />
          {view !== 'events' && view !== 'subscriptions' && (
            <Select
              name="status"
              value={status}
              onChange={event => {
                setStatus(event.target.value)
                setPage(1)
              }}
              aria-label="Filter by status"
              className="sm:w-36"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </Select>
          )}
          {view === 'history' && (
            <Select
              name="lockState"
              value={lockState}
              onChange={event => {
                setLockState(event.target.value)
                setPage(1)
              }}
              aria-label="Filter by lock state"
              className="sm:w-36"
            >
              <option value="">All locks</option>
              <option value="queued">Queued</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </Select>
          )}
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="shrink-0">
              <RotateCcw className="size-3.5" /> Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <TableHeader view={view} />
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({length: 8}, (_, index) => (
                    <tr key={index} className="border-b border-[var(--border)]">
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-7 w-full" />
                      </td>
                    </tr>
                  ))
                : data?.items.map(record => (
                    <tr
                      key={record.id}
                      className="group cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
                      onClick={() => setSelected(record)}
                    >
                      <RecordCells view={view} record={record} />
                      <td className="px-2 py-3 text-right">
                        <ChevronRight className="size-3.5 text-[var(--text-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)]" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && error && (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <CircleSlash2 className="size-7 text-[var(--danger)]" />
              <p className="mt-3 text-base font-medium sm:text-sm">Could not query MongoDB</p>
              <p className="mt-1 max-w-md text-base text-[var(--text-muted)] sm:text-sm">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && data?.items.length === 0 && (
            <div className="flex flex-col items-center px-5 py-16 text-center">
              <Icon className="size-5 text-[var(--text-muted)]" />
              <p className="mt-3 text-base font-medium sm:text-sm">No matching records</p>
              <p className="mt-1 text-base text-[var(--text-muted)] sm:text-sm">
                Try a different filter or wait for Pulse activity.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2.5">
          <p className="text-sm text-[var(--text-muted)]">
            Page {data?.pagination.page ?? page} of {data?.pagination.pages ?? 1}
          </p>
          <div className="flex items-center gap-1.5">
            {loading && (
              <LoaderCircle className="mr-1 size-3.5 animate-spin text-[var(--text-subtle)]" />
            )}
            <Button
              variant="outline"
              className="h-8 px-2.5"
              disabled={page <= 1}
              onClick={() => setPage(value => Math.max(1, value - 1))}
            >
              <ArrowLeft className="size-3.5" /> Previous
            </Button>
            <Button
              variant="outline"
              className="h-8 px-2.5"
              disabled={page >= (data?.pagination.pages ?? 1)}
              onClick={() => setPage(value => value + 1)}
            >
              Next <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <DetailDrawer record={selected} onClose={() => setSelected(undefined)} />
    </div>
  )
}
