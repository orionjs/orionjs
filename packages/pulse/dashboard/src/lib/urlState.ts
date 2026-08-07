import type {View} from '../types'

export type DashboardRange = '1h' | '6h' | '24h' | '7d' | '30d'
export type UrlHistoryMode = 'push' | 'replace'

export interface DashboardUrlState {
  view: View
  range: DashboardRange
  live: boolean
  search: string
  status: '' | 'pending' | 'success' | 'error'
  lockState: '' | 'queued' | 'active' | 'expired'
  page: number
  recordId?: string
  topic?: string
  consumerGroup?: string
}

export type DashboardUrlUpdate = (
  patch: Partial<Omit<DashboardUrlState, 'view'>>,
  mode?: UrlHistoryMode,
) => void

const VIEWS = new Set<View>([
  'overview',
  'topology',
  'deliveries',
  'history',
  'events',
  'subscriptions',
])
const RANGES = new Set<DashboardRange>(['1h', '6h', '24h', '7d', '30d'])
const STATUSES = new Set<DashboardUrlState['status']>(['', 'pending', 'success', 'error'])
const LOCK_STATES = new Set<DashboardUrlState['lockState']>(['', 'queued', 'active', 'expired'])

export const DEFAULT_DASHBOARD_URL_STATE: DashboardUrlState = {
  view: 'overview',
  range: '24h',
  live: true,
  search: '',
  status: '',
  lockState: '',
  page: 1,
}

function nonEmpty(value: string | null) {
  return value?.trim() || undefined
}

function readView(pathname: string): View {
  const candidate = pathname.replace(/^\/+|\/+$/g, '') || 'overview'
  return VIEWS.has(candidate as View) ? (candidate as View) : 'overview'
}

export function normalizeDashboardUrlState(value: Partial<DashboardUrlState>): DashboardUrlState {
  const view = value.view && VIEWS.has(value.view) ? value.view : 'overview'
  const page = Number.isFinite(value.page) ? Math.max(1, Math.floor(value.page ?? 1)) : 1
  return {
    view,
    range: value.range && RANGES.has(value.range) ? value.range : '24h',
    live: value.live !== false,
    search: value.search ?? '',
    status:
      (view === 'deliveries' || view === 'history') && value.status && STATUSES.has(value.status)
        ? value.status
        : '',
    lockState:
      view === 'history' && value.lockState && LOCK_STATES.has(value.lockState)
        ? value.lockState
        : '',
    page,
    recordId: nonEmpty(value.recordId ?? null),
    topic: nonEmpty(value.topic ?? null),
    consumerGroup: nonEmpty(value.consumerGroup ?? null),
  }
}

export function readDashboardUrlState(hash: string): DashboardUrlState {
  const raw = hash.replace(/^#/, '')
  const queryIndex = raw.indexOf('?')
  const pathname = queryIndex === -1 ? raw : raw.slice(0, queryIndex)
  const parameters = new URLSearchParams(queryIndex === -1 ? '' : raw.slice(queryIndex + 1))
  const rawPage = Number.parseInt(parameters.get('page') ?? '1', 10)
  const status = parameters.get('status') ?? ''
  const lockState = parameters.get('lock') ?? ''
  const range = parameters.get('range') ?? ''

  return normalizeDashboardUrlState({
    view: readView(pathname),
    range: RANGES.has(range as DashboardRange) ? (range as DashboardRange) : '24h',
    live: parameters.get('live') !== 'false',
    search: parameters.get('search') ?? '',
    status: STATUSES.has(status as DashboardUrlState['status'])
      ? (status as DashboardUrlState['status'])
      : '',
    lockState: LOCK_STATES.has(lockState as DashboardUrlState['lockState'])
      ? (lockState as DashboardUrlState['lockState'])
      : '',
    page: Number.isFinite(rawPage) ? rawPage : 1,
    recordId: parameters.get('id') ?? undefined,
    topic: parameters.get('topic') ?? undefined,
    consumerGroup: parameters.get('consumer') ?? undefined,
  })
}

function setParameter(parameters: URLSearchParams, name: string, value?: string) {
  if (value) parameters.set(name, value)
}

export function serializeDashboardUrlState(value: DashboardUrlState) {
  const state = normalizeDashboardUrlState(value)
  const parameters = new URLSearchParams()
  if (state.range !== '24h') parameters.set('range', state.range)
  if (!state.live) parameters.set('live', 'false')

  if (state.view === 'topology') {
    setParameter(parameters, 'search', state.search)
    setParameter(parameters, 'topic', state.topic)
  } else if (state.view !== 'overview') {
    setParameter(parameters, 'search', state.search)
    if (state.view === 'deliveries' || state.view === 'history') {
      setParameter(parameters, 'status', state.status)
    }
    if (state.view === 'history') setParameter(parameters, 'lock', state.lockState)
    if (state.page > 1) parameters.set('page', String(state.page))
    setParameter(parameters, 'topic', state.topic)
    setParameter(parameters, 'consumer', state.consumerGroup)
    setParameter(parameters, 'id', state.recordId)
  }

  const pathname = state.view === 'overview' ? '/' : `/${state.view}`
  const query = parameters.toString()
  return `#${pathname}${query ? `?${query}` : ''}`
}

export function stateForView(current: DashboardUrlState, view: View): DashboardUrlState {
  return {
    ...DEFAULT_DASHBOARD_URL_STATE,
    view,
    range: current.range,
    live: current.live,
  }
}
