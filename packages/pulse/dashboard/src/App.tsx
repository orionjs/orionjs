import {lazy, Suspense, useCallback, useEffect, useState} from 'react'
import {Shell} from './components/Shell'
import {apiGet} from './lib/api'
import type {OverviewData, View} from './types'

const Overview = lazy(async () => ({
  default: (await import('./components/Overview')).Overview,
}))
const Explorer = lazy(async () => ({
  default: (await import('./components/Explorer')).Explorer,
}))

function ViewFallback() {
  return (
    <output className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <span className="sr-only">Loading dashboard view</span>
      {Array.from({length: 4}, (_, index) => (
        <div key={index} className="skeleton h-[132px] rounded-md" />
      ))}
    </output>
  )
}

function readView(): View {
  const candidate = window.location.hash.replace(/^#\/?/, '')
  return candidate === 'deliveries' ||
    candidate === 'history' ||
    candidate === 'events' ||
    candidate === 'subscriptions'
    ? candidate
    : 'overview'
}

function readTheme(): 'dark' | 'light' {
  const stored = window.localStorage.getItem('pulse-dashboard-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function App() {
  const [view, setView] = useState<View>(readView)
  const [theme, setTheme] = useState<'dark' | 'light'>(readTheme)
  const [live, setLive] = useState(true)
  const [range, setRange] = useState('24h')
  const [overview, setOverview] = useState<OverviewData>()
  const [overviewError, setOverviewError] = useState<string>()
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('pulse-dashboard-theme', theme)
  }, [theme])
  useEffect(() => {
    const onHashChange = () => setView(readView())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((nextView: View) => {
    window.location.hash = nextView === 'overview' ? '/' : `/${nextView}`
    setView(nextView)
  }, [])

  const loadOverview = useCallback(async () => {
    setRefreshing(true)
    try {
      const response = await apiGet<OverviewData>('/api/overview', {range})
      setOverview(response.data)
      setOverviewError(undefined)
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : String(error))
    } finally {
      setOverviewLoading(false)
      setRefreshing(false)
    }
  }, [range])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview, refreshSignal])
  useEffect(() => {
    if (!live) return
    const interval = window.setInterval(() => void loadOverview(), 5000)
    return () => window.clearInterval(interval)
  }, [live, loadOverview])

  const refresh = () => setRefreshSignal(value => value + 1)

  return (
    <Shell
      view={view}
      onViewChange={navigate}
      live={live}
      onLiveChange={setLive}
      onRefresh={refresh}
      refreshing={refreshing}
      generatedAt={overview?.generatedAt}
      database={overview?.database}
      prefix={overview?.collectionPrefix}
      health={overview?.health.status}
      theme={theme}
      onThemeChange={() => setTheme(value => (value === 'dark' ? 'light' : 'dark'))}
    >
      <Suspense fallback={<ViewFallback />}>
        {view === 'overview' ? (
          <Overview
            data={overview}
            loading={overviewLoading}
            error={overviewError}
            range={range}
            onRangeChange={setRange}
            onNavigate={navigate}
          />
        ) : (
          <Explorer
            view={view}
            live={live}
            refreshSignal={refreshSignal}
            onRefreshing={setRefreshing}
          />
        )}
      </Suspense>
    </Shell>
  )
}
