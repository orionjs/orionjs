import {Check, Clipboard, Clock3, Code2, X} from 'lucide-react'
import {useEffect, useState} from 'react'
import {formatDate, formatDuration, truncateId} from '../lib/utils'
import type {PulseRecord} from '../types'
import {StatusBadge} from './StatusBadge'
import {Button} from './ui'

function DetailItem({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="border-b border-[var(--border)] py-3 last:border-0">
      <dt className="text-base text-[var(--text-muted)] sm:text-sm">{label}</dt>
      <dd className="mt-1 text-base text-[var(--text)] sm:text-sm">{children}</dd>
    </div>
  )
}

export function DetailDrawer({record, onClose}: {record?: PulseRecord; onClose(): void}) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!record) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [record, onClose])

  if (!record) return null
  const payload = record.event?.data ?? record.data
  const headers = record.event?.headers ?? record.headers
  const copyId = async () => {
    await navigator.clipboard.writeText(record.eventId ?? record.id)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Record details">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close details"
      />
      <aside className="drawer-enter absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-xl dark:shadow-none">
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold">Record detail</h2>
              <StatusBadge status={record.status ?? record.lockState ?? 'idle'} />
            </div>
            <p className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">{record.id}</p>
          </div>
          <Button variant="icon" onClick={onClose} aria-label="Close record details">
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-4 rounded-md bg-[var(--surface-inset)] p-3">
              <div className="min-w-0">
                <p className="text-sm text-[var(--text-muted)]">Event ID</p>
                <p className="mt-1 truncate font-mono text-sm">{record.eventId ?? record.id}</p>
              </div>
              <Button
                variant="icon"
                className="size-8 shrink-0"
                onClick={copyId}
                aria-label="Copy event ID"
              >
                {copied ? (
                  <Check className="size-3.5 text-[var(--success)]" />
                ) : (
                  <Clipboard className="size-3.5" />
                )}
              </Button>
            </div>
          </div>

          <dl className="px-4 sm:px-5">
            {record.topic && (
              <DetailItem label="Topic">
                <span className="font-mono">{record.topic}</span>
              </DetailItem>
            )}
            {record.consumerGroup && (
              <DetailItem label="Consumer group">
                <span className="font-mono">{record.consumerGroup}</span>
              </DetailItem>
            )}
            {(record.attempt || record.finalAttempt) && (
              <DetailItem label="Attempt">{record.attempt ?? record.finalAttempt}</DetailItem>
            )}
            {record.delivery && <DetailItem label="Delivery mode">{record.delivery}</DetailItem>}
            {record.lockState && (
              <DetailItem label="Lock state">
                <StatusBadge status={record.lockState} />
              </DetailItem>
            )}
            {record.durationMs !== undefined && (
              <DetailItem label="Duration">{formatDuration(record.durationMs)}</DetailItem>
            )}
            <DetailItem label="Created">
              {formatDate(record.createdAt ?? record.eventCreatedAt)}
            </DetailItem>
            {(record.updatedAt || record.endedAt) && (
              <DetailItem label={record.endedAt ? 'Ended' : 'Updated'}>
                {formatDate(record.endedAt ?? record.updatedAt)}
              </DetailItem>
            )}
            {record.expiresAt && (
              <DetailItem label="Expires">{formatDate(record.expiresAt)}</DetailItem>
            )}
          </dl>

          {record.error && (
            <div className="m-4 rounded-md border border-[var(--danger-border)] bg-[var(--danger-muted)] p-4 sm:m-5">
              <div className="flex items-center gap-2 text-[var(--danger)]">
                <Clock3 className="size-4" />
                <h3 className="text-sm font-semibold">
                  {record.error.code ?? record.error.name ?? 'Handler error'}
                </h3>
              </div>
              <p className="mt-2 text-base text-[var(--text)] sm:text-sm">{record.error.message}</p>
            </div>
          )}

          {payload !== undefined && (
            <div className="px-4 py-4 sm:px-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Code2 className="size-4 text-[var(--text-muted)]" /> Event payload
                </h3>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {truncateId(record.eventId ?? record.id, 5)}
                </span>
              </div>
              <pre className="max-h-[360px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--code)] p-4 font-mono text-xs text-[var(--code-text)]">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}

          {headers !== undefined && (
            <div className="px-4 pb-6 sm:px-5">
              <h3 className="mb-2 text-sm font-semibold">Headers</h3>
              <pre className="overflow-auto rounded-md border border-[var(--border)] bg-[var(--code)] p-4 font-mono text-xs text-[var(--code-text)]">
                {JSON.stringify(headers, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
