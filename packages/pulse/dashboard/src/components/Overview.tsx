import {ArrowRight, CheckCircle2, ServerCog} from 'lucide-react'
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import type {DashboardRange} from '../lib/urlState'
import {formatDate, formatDuration, formatNumber, formatPercent, truncateId} from '../lib/utils'
import type {OverviewData, PulseRecord} from '../types'
import {MetricCard} from './MetricCard'
import {StatusBadge} from './StatusBadge'
import {Button, Card, Select, Skeleton} from './ui'

interface OverviewProps {
  data?: OverviewData
  loading: boolean
  error?: string
  range: DashboardRange
  onRangeChange(value: DashboardRange): void
  onNavigate(view: 'deliveries' | 'history'): void
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">{title}</h2>
        {description && (
          <p className="mt-1 text-base text-[var(--text-muted)] sm:text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function ChartTooltip({active, payload, label}: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-md dark:shadow-none">
      <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">{formatDate(label)}</p>
      <div className="space-y-1.5">
        {payload.map((item: any) => (
          <div
            key={item.dataKey}
            className="flex min-w-32 items-center justify-between gap-5 text-sm"
          >
            <span className="flex items-center gap-2 text-[var(--text-muted)]">
              <span className="size-1.5 rounded-full" style={{backgroundColor: item.color}} />
              {item.name}
            </span>
            <span className="font-mono font-semibold text-[var(--text)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorRow({record}: {record: PulseRecord}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-[var(--border)] px-4 py-3 first:border-t-0 sm:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-[var(--danger)]" />
          <p className="truncate text-base font-medium text-[var(--text)] sm:text-sm">
            {record.topic}
          </p>
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {truncateId(record.eventId, 5)}
          </span>
        </div>
        <p className="mt-1 truncate text-base text-[var(--text-muted)] sm:text-sm">
          {record.error?.message ?? 'Unknown worker error'}
        </p>
      </div>
      <div className="text-right">
        <StatusBadge status={record.error?.code === 'worker_lost' ? 'expired' : 'error'} />
        <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(record.endedAt)}</p>
      </div>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({length: 4}, (_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-none" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.7fr)]">
        <Skeleton className="h-[360px]" />
        <Skeleton className="h-[360px]" />
      </div>
    </div>
  )
}

export function Overview({data, loading, error, range, onRangeChange, onNavigate}: OverviewProps) {
  if (loading && !data) return <OverviewSkeleton />
  if (error && !data) {
    return (
      <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-md border border-[var(--danger-border)] bg-[var(--danger-muted)] text-[var(--danger)]">
          <ServerCog className="size-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold">Could not read Pulse collections</h2>
        <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{error}</p>
      </Card>
    )
  }
  if (!data) return null

  const successRate =
    data.deliveryStatus.success + data.deliveryStatus.error === 0
      ? 1
      : data.deliveryStatus.success / (data.deliveryStatus.success + data.deliveryStatus.error)
  const chartData = data.timeline.map(point => ({...point, label: point.timestamp}))

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-base text-[var(--text-muted)] sm:text-sm">
          <span className="font-mono text-[var(--text)]">{data.database}</span>
          {' · '}Direct from MongoDB{' · '}
          <span className="tabular-nums">{data.ping.latencyMs} ms</span>
        </p>
        <Select
          name="range"
          aria-label="Overview time range"
          value={range}
          onChange={event => onRangeChange(event.target.value as DashboardRange)}
        >
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </Select>
      </div>

      <Card className="@container overflow-hidden">
        <div className="grid @md:grid-cols-2 @4xl:grid-cols-4">
          <MetricCard
            label="Pending deliveries"
            value={formatNumber(data.deliveryStatus.pending)}
            helper={`${formatNumber(data.locks.active)} currently running`}
          />
          <MetricCard
            className="border-t border-[var(--border)] @md:border-l @md:border-t-0"
            label="Delivery success"
            value={formatPercent(successRate)}
            helper={`${formatNumber(data.deliveryStatus.success)} completed`}
          />
          <MetricCard
            className="border-t border-[var(--border)] @4xl:border-l @4xl:border-t-0"
            label="Retained events"
            value={formatNumber(data.totals.events)}
            helper={`${formatNumber(data.totals.deliveries)} group deliveries`}
          />
          <MetricCard
            className="border-t border-[var(--border)] @md:border-l @4xl:border-t-0"
            label="Expired locks"
            value={formatNumber(data.locks.expired)}
            helper={`${formatNumber(data.locks.queued)} queued attempts`}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
        <Card className="min-w-0 overflow-hidden">
          <SectionHeader
            title="Event flow"
            description={`Published events and completed attempts · ${range}`}
            action={
              <div className="hidden items-center gap-3 text-sm text-[var(--text-muted)] sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[var(--chart-published)]" /> Published
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[var(--chart-success)]" /> Success
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[var(--chart-error)]" /> Errors
                </span>
              </div>
            }
          />
          <div className="h-[300px] px-1 pb-4 pr-4 sm:px-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{top: 12, right: 4, left: -24, bottom: 0}}>
                <defs>
                  <linearGradient id="publishedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-published)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart-published)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-success)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--chart-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="label"
                  tickFormatter={value =>
                    new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      ...(range === '7d' || range === '30d'
                        ? {month: 'short', day: 'numeric'}
                        : {}),
                    }).format(new Date(value))
                  }
                  tick={{fill: 'var(--text-subtle)', fontSize: 9}}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={36}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{fill: 'var(--text-subtle)', fontSize: 9}}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{stroke: 'var(--border-strong)'}} />
                <Area
                  type="monotone"
                  dataKey="published"
                  name="Published"
                  stroke="var(--chart-published)"
                  fill="url(#publishedFill)"
                  strokeWidth={1.7}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  name="Success"
                  stroke="var(--chart-success)"
                  fill="url(#successFill)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="error"
                  name="Errors"
                  stroke="var(--chart-error)"
                  fill="transparent"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <SectionHeader title="System health" description="Signals that need operator attention" />
          <div className="px-4 pb-5 sm:px-5">
            <div className="flex items-center justify-between rounded-md bg-[var(--surface-inset)] p-3">
              <div>
                <p className="text-base font-medium sm:text-sm">Overall state</p>
                <p className="mt-1 text-base text-[var(--text-muted)] sm:text-sm">
                  MongoDB is responding
                </p>
              </div>
              <StatusBadge status={data.health.status} />
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex justify-between gap-3 pb-2 text-base sm:text-sm">
                  <span className="text-[var(--text-muted)]">Error rate</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatPercent(data.health.errorRate)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-inset)]">
                  <div
                    className="h-full rounded-full bg-[var(--danger)] transition-all"
                    style={{width: `${Math.min(100, data.health.errorRate * 100)}%`}}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[var(--border)] border-y border-[var(--border)] py-3">
                <div className="pr-3">
                  <p className="text-base text-[var(--text-muted)] sm:text-sm">Oldest pending</p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {formatDuration(data.health.oldestPendingMs)}
                  </p>
                </div>
                <div className="pl-3">
                  <p className="text-base text-[var(--text-muted)] sm:text-sm">DB latency</p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {data.ping.latencyMs} ms
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {label: 'Running', value: data.locks.active, className: 'text-[var(--success)]'},
                  {label: 'Queued', value: data.locks.queued, className: 'text-[var(--info)]'},
                  {label: 'Expired', value: data.locks.expired, className: 'text-[var(--danger)]'},
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p
                      className={`font-mono text-base font-semibold tabular-nums ${item.className}`}
                    >
                      {item.value}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <Card className="min-w-0 overflow-hidden">
          <SectionHeader
            title="Topics"
            description="Retained volume and delivery outcomes"
            action={
              <Button
                variant="ghost"
                onClick={() => onNavigate('deliveries')}
                className="h-8 text-xs"
              >
                View all <ArrowRight className="size-3.5" />
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-y border-[var(--border)] text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="whitespace-nowrap px-5 py-2.5 font-medium">Topic</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">Events</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">Pending</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">Errors</th>
                  <th className="whitespace-nowrap px-5 py-2.5 text-right font-medium">
                    Last activity
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topics.slice(0, 7).map(topic => (
                  <tr key={topic.topic} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3">
                      <span className="max-w-[260px] truncate font-mono text-sm font-medium text-[var(--text)]">
                        {topic.topic}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-[var(--text-muted)] tabular-nums">
                      {formatNumber(topic.events)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-[var(--warning)] tabular-nums">
                      {formatNumber(topic.pending)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-[var(--danger)] tabular-nums">
                      {formatNumber(topic.error)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-[var(--text-muted)]">
                      {formatDate(topic.lastActivityAt)}
                    </td>
                  </tr>
                ))}
                {data.topics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[var(--text-subtle)]">
                      No Pulse topics have been published yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <SectionHeader
            title="Recent failures"
            description="Latest errored execution attempts"
            action={
              <Button variant="ghost" onClick={() => onNavigate('history')} className="h-8 text-xs">
                Inspect <ArrowRight className="size-3.5" />
              </Button>
            }
          />
          <div className="border-t border-[var(--border)]">
            {data.recentErrors.slice(0, 5).map(record => (
              <ErrorRow key={record.id} record={record} />
            ))}
            {data.recentErrors.length === 0 && (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--success-muted)] text-[var(--success)]">
                  <CheckCircle2 className="size-4" />
                </div>
                <p className="mt-3 text-xs font-medium">No retained failures</p>
                <p className="mt-1 text-base text-[var(--text-muted)] sm:text-sm">
                  All visible attempts are clean.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <SectionHeader
          title="Consumer groups"
          description="Delivery state grouped by service family"
        />
        <div className="grid border-t border-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
          {data.consumerGroups.slice(0, 8).map(group => (
            <div
              key={group.consumerGroup}
              className="border-b border-[var(--border)] p-4 sm:[&:nth-child(2n)]:border-l xl:border-l xl:first:border-l-0"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-mono text-sm font-medium">{group.consumerGroup}</p>
                <StatusBadge
                  status={group.error > 0 ? 'attention' : group.pending > 0 ? 'pending' : 'healthy'}
                />
              </div>
              <div className="mt-3 flex items-center gap-4 text-base text-[var(--text-muted)] sm:text-sm">
                <span>
                  <strong className="font-mono font-medium text-[var(--warning)] tabular-nums">
                    {group.pending}
                  </strong>{' '}
                  pending
                </span>
                <span>
                  <strong className="font-mono font-medium text-[var(--danger)] tabular-nums">
                    {group.error}
                  </strong>{' '}
                  errors
                </span>
              </div>
            </div>
          ))}
          {data.consumerGroups.length === 0 && (
            <div className="col-span-full bg-[var(--surface)] px-5 py-10 text-center text-xs text-[var(--text-subtle)]">
              Consumer groups appear after the first delivery is materialized.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
