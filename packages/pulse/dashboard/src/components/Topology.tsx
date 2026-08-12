import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  type NodeTypes,
  Position,
  ReactFlow,
} from '@xyflow/react'
import {Headphones, MessageSquareText, RadioTower, ServerCog} from 'lucide-react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {apiGet} from '../lib/api'
import {canPollDashboard, canQueryDashboard} from '../lib/polling'
import type {DashboardRange, DashboardUrlState, DashboardUrlUpdate} from '../lib/urlState'
import {cn, formatDate, formatNumber} from '../lib/utils'
import type {TopologyData, TopologyEdge, TopologyTopic} from '../types'
import {Badge, Card, SearchInput, Select, Skeleton} from './ui'

interface TopologyProps {
  live: boolean
  active: boolean
  refreshSignal: number
  onRefreshing(value: boolean): void
  urlState: DashboardUrlState
  onUrlStateChange: DashboardUrlUpdate
  onMetadata(value: TopologyData): void
}

type FlowNodeKind = 'publisher' | 'topic' | 'consumer'
type FlowNodeData = {
  kind: FlowNodeKind
  label: string
  primaryMetric: string
  secondaryMetric: string
  status: 'healthy' | 'attention' | 'critical' | 'neutral'
}
type PulseFlowNode = Node<FlowNodeData, 'pulse'>

const COLUMN_X: Record<FlowNodeKind, number> = {
  publisher: 0,
  topic: 360,
  consumer: 720,
}
const NODE_GAP = 124

function PulseNode({data}: NodeProps<PulseFlowNode>) {
  const Icon =
    data.kind === 'publisher' ? RadioTower : data.kind === 'topic' ? MessageSquareText : Headphones
  return (
    <div className="w-[230px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm dark:shadow-none">
      {data.kind !== 'publisher' && (
        <Handle
          type="target"
          position={Position.Left}
          className="pointer-events-none! opacity-0!"
        />
      )}
      <div className="flex items-start gap-2.5">
        <Icon className="size-4 h-lh shrink-0 stroke-[var(--text-muted)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-sm font-medium text-[var(--text-strong)]">
              {data.label}
            </p>
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                data.status === 'critical'
                  ? 'bg-[var(--danger)]'
                  : data.status === 'attention'
                    ? 'bg-[var(--warning)]'
                    : data.status === 'healthy'
                      ? 'bg-[var(--success)]'
                      : 'bg-[var(--text-subtle)]',
              )}
            />
          </div>
          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">{data.primaryMetric}</p>
          <p className="mt-0.5 truncate text-sm text-[var(--text-subtle)]">
            {data.secondaryMetric}
          </p>
        </div>
      </div>
      {data.kind !== 'consumer' && (
        <Handle
          type="source"
          position={Position.Right}
          className="pointer-events-none! opacity-0!"
        />
      )}
    </div>
  )
}

const nodeTypes = {pulse: PulseNode} satisfies NodeTypes

function statusFor(value: {pending?: number; error?: number}) {
  if ((value.error ?? 0) > 0) return 'critical' as const
  if ((value.pending ?? 0) > 0) return 'attention' as const
  return 'healthy' as const
}

function countLabel(value: number, singular: string) {
  return `${formatNumber(value)} ${singular}${value === 1 ? '' : 's'}`
}

function orderTopics(topics: TopologyTopic[]) {
  return [...topics].sort(
    (left, right) =>
      right.events - left.events ||
      right.consumers - left.consumers ||
      left.name.localeCompare(right.name),
  )
}

function buildTopicGraph(data: TopologyData, topic: TopologyTopic) {
  const publishingEdges = data.edges.filter(
    edge => edge.kind === 'publishes' && edge.target === topic.id,
  )
  const subscriptionEdges = data.edges.filter(
    edge => edge.kind === 'subscribes' && edge.source === topic.id,
  )
  const publisherIds = new Set(publishingEdges.map(edge => edge.source))
  const consumerIds = new Set(subscriptionEdges.map(edge => edge.target))
  const publishers = data.publishers.filter(publisher => publisherIds.has(publisher.id))
  const consumers = data.consumerGroups.filter(consumer => consumerIds.has(consumer.id))
  const publishingEdgeByPublisher = new Map(publishingEdges.map(edge => [edge.source, edge]))
  const subscriptionEdgeByConsumer = new Map(subscriptionEdges.map(edge => [edge.target, edge]))
  const tallestColumn = Math.max(publishers.length, consumers.length, 1)
  const position = (kind: FlowNodeKind, index: number, count: number) => ({
    x: COLUMN_X[kind],
    y: index * NODE_GAP + ((tallestColumn - count) * NODE_GAP) / 2,
  })

  const nodes: PulseFlowNode[] = [
    ...publishers.map((publisher, index): PulseFlowNode => {
      const relation = publishingEdgeByPublisher.get(publisher.id)
      return {
        id: publisher.id,
        type: 'pulse',
        position: position('publisher', index, publishers.length),
        data: {
          kind: 'publisher',
          label: publisher.name,
          primaryMetric: countLabel(relation?.events ?? 0, 'event'),
          secondaryMetric: publisher.sourceField
            ? `via ${publisher.sourceField}`
            : 'Identity not recorded',
          status: publisher.sourceField ? 'neutral' : 'attention',
        },
        ariaLabel: `Publisher ${publisher.name}`,
      }
    }),
    {
      id: topic.id,
      type: 'pulse',
      position: position('topic', 0, 1),
      data: {
        kind: 'topic',
        label: topic.name,
        primaryMetric: countLabel(topic.events, 'event'),
        secondaryMetric: countLabel(consumers.length, 'consumer group'),
        status: statusFor(topic),
      },
      ariaLabel: `Topic ${topic.name}`,
    },
    ...consumers.map((consumer, index): PulseFlowNode => {
      const relation = subscriptionEdgeByConsumer.get(consumer.id)
      return {
        id: consumer.id,
        type: 'pulse',
        position: position('consumer', index, consumers.length),
        data: {
          kind: 'consumer',
          label: consumer.name,
          primaryMetric: relation?.active ? 'Active listener' : 'Subscribed',
          secondaryMetric: `${formatNumber(relation?.pending ?? 0)} pending · ${formatNumber(relation?.error ?? 0)} errors`,
          status: statusFor(relation ?? {}),
        },
        ariaLabel: `Consumer group ${consumer.name}`,
      }
    }),
  ]

  return {
    nodes,
    edges: [...publishingEdges, ...subscriptionEdges].map(edge => topicEdge(edge)),
    publishers: publishers.length,
    knownPublishers: publishers.filter(publisher => publisher.sourceField).length,
    consumers: consumers.length,
  }
}

function topicEdge(edge: TopologyEdge) {
  const color =
    edge.kind === 'publishes'
      ? 'var(--topology-publisher-edge)'
      : (edge.error ?? 0) > 0
        ? 'var(--danger)'
        : (edge.pending ?? 0) > 0
          ? 'var(--warning)'
          : 'var(--topology-consumer-edge)'
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    selectable: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color,
    },
    style: {stroke: color, strokeWidth: edge.kind === 'publishes' ? 1.25 : 1.5},
  }
}

function Metric({label, value, helper}: {label: string; value: string; helper: string}) {
  return (
    <div className="min-w-0 border-t border-[var(--border)] p-4 first:border-t-0 @md:border-l @md:border-t-0 @md:first:border-l-0">
      <p className="truncate text-base text-[var(--text-muted)] sm:text-sm">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 truncate text-base text-[var(--text-subtle)] sm:text-sm">{helper}</p>
    </div>
  )
}

function TopicListItem({
  topic,
  selected,
  onSelect,
}: {
  topic: TopologyTopic
  selected: boolean
  onSelect(): void
}) {
  const issues = topic.pending + topic.error
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-start gap-3 border-b border-[var(--border)] p-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--focus)]',
        selected && 'bg-[var(--surface-selected)]',
      )}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          topic.error > 0
            ? 'bg-[var(--danger)]'
            : topic.pending > 0
              ? 'bg-[var(--warning)]'
              : 'bg-[var(--success)]',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-sm font-medium text-[var(--text-strong)]">
          {topic.name}
        </span>
        <span className="mt-1 block truncate text-sm text-[var(--text-muted)]">
          {countLabel(topic.events, 'event')} · {countLabel(topic.consumers, 'consumer')}
        </span>
        <span className="mt-0.5 block truncate text-sm text-[var(--text-subtle)]">
          {issues > 0 ? `${countLabel(issues, 'issue')} · ` : ''}
          {formatDate(topic.lastActivityAt)}
        </span>
      </span>
    </button>
  )
}

function TopologySkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-16" />
      <Skeleton className="h-[720px]" />
    </div>
  )
}

export function Topology({
  live,
  active,
  refreshSignal,
  onRefreshing,
  urlState,
  onUrlStateChange,
  onMetadata,
}: TopologyProps) {
  const [data, setData] = useState<TopologyData>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [compactGraph, setCompactGraph] = useState(
    () => window.matchMedia('(max-width: 639px)').matches,
  )
  const {range, search, topic: selectedTopicName} = urlState

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const update = () => setCompactGraph(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const load = useCallback(async () => {
    if (!canQueryDashboard(document.visibilityState === 'visible', active)) return
    onRefreshing(true)
    try {
      const response = await apiGet<TopologyData>('/api/topology', {range})
      setData(response.data)
      onMetadata(response.data)
      setError(undefined)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setLoading(false)
      onRefreshing(false)
    }
  }, [active, onMetadata, onRefreshing, range])

  useEffect(() => {
    if (!active) return
    void load()
  }, [active, load, refreshSignal])
  useEffect(() => {
    if (!canPollDashboard(active, true, live)) return
    const interval = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(interval)
  }, [active, live, load])

  const topics = useMemo(() => (data ? orderTopics(data.topics) : []), [data])
  const filteredTopics = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query ? topics.filter(topic => topic.name.toLocaleLowerCase().includes(query)) : topics
  }, [search, topics])
  const selectedTopic = data?.topics.find(topic => topic.name === selectedTopicName) ?? topics[0]
  const graph = useMemo(
    () => (data && selectedTopic ? buildTopicGraph(data, selectedTopic) : undefined),
    [data, selectedTopic],
  )

  useEffect(() => {
    if (selectedTopic && selectedTopic.name !== selectedTopicName) {
      onUrlStateChange({topic: selectedTopic.name}, 'replace')
    }
  }, [onUrlStateChange, selectedTopic, selectedTopicName])

  if (loading && !data) return <TopologySkeleton />
  if (error && !data) {
    return (
      <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <ServerCog className="size-6 stroke-[var(--danger)]" />
        <h2 className="mt-4 text-base font-semibold">Could not load Pulse topics</h2>
        <p className="mt-2 max-w-md text-pretty text-base text-[var(--text-muted)] sm:text-sm">
          {error}
        </p>
      </Card>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-balance text-xl font-semibold text-[var(--text-strong)]">
            Topic relationships
          </h2>
          <p className="mt-1 max-w-[70ch] text-pretty text-base text-[var(--text-muted)] sm:text-sm">
            Choose one topic to see only who publishes it and which consumer groups receive it.
          </p>
        </div>
        <Select
          name="topology-range"
          aria-label="Topology time range"
          value={range}
          onChange={event =>
            onUrlStateChange({range: event.target.value as DashboardRange}, 'replace')
          }
        >
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </Select>
      </div>

      <Card className="@container overflow-hidden">
        {data.truncated && (
          <div className="border-b border-[var(--warning-border)] bg-[var(--warning-muted)] px-4 py-2.5 text-base text-[var(--warning)] sm:text-sm">
            This system is large. Topic relationships are limited to the 500 most active records.
          </div>
        )}

        <div className="grid @5xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="min-w-0 border-b border-[var(--border)] @5xl:border-b-0 @5xl:border-r">
            <div className="space-y-3 border-b border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--text-strong)]">Topics</h2>
                <span className="font-mono text-sm tabular-nums text-[var(--text-muted)]">
                  {formatNumber(data.topics.length)}
                </span>
              </div>
              <SearchInput
                type="search"
                name="topology-topic-search"
                value={search}
                onChange={event => onUrlStateChange({search: event.target.value}, 'replace')}
                placeholder="Find a topic…"
                aria-label="Filter topics"
              />
            </div>

            <ul className="max-h-72 overflow-y-auto @5xl:max-h-[688px]">
              {filteredTopics.length > 0 ? (
                filteredTopics.map(topic => (
                  <li key={topic.id}>
                    <TopicListItem
                      topic={topic}
                      selected={topic.id === selectedTopic?.id}
                      onSelect={() => onUrlStateChange({topic: topic.name}, 'push')}
                    />
                  </li>
                ))
              ) : (
                <li className="p-6 text-center">
                  <MessageSquareText className="mx-auto size-4 stroke-[var(--text-subtle)]" />
                  <p className="mt-3 text-sm font-medium">No topics found</p>
                  <p className="mt-1 text-base text-[var(--text-muted)] sm:text-sm">
                    Try a different search.
                  </p>
                </li>
              )}
            </ul>
          </aside>

          <section className="min-w-0">
            {selectedTopic && graph ? (
              <>
                <div className="border-b border-[var(--border)] p-5">
                  <Badge className="border-[var(--border)] bg-[var(--surface-inset)] text-[var(--text-muted)]">
                    Selected topic
                  </Badge>
                  <h2 className="mt-3 break-words font-mono text-lg font-semibold text-[var(--text-strong)]">
                    {selectedTopic.name}
                  </h2>
                  <p className="mt-1 text-base text-[var(--text-muted)] sm:text-sm">
                    Last activity {formatDate(selectedTopic.lastActivityAt)}
                  </p>
                </div>

                <div className="@container grid border-b border-[var(--border)] @md:grid-cols-4">
                  <Metric
                    label="Published events"
                    value={formatNumber(selectedTopic.events)}
                    helper={`Within ${range}`}
                  />
                  <Metric
                    label="Known publishers"
                    value={formatNumber(graph.knownPublishers)}
                    helper={`${formatNumber(graph.publishers - graph.knownPublishers)} unidentified`}
                  />
                  <Metric
                    label="Consumer groups"
                    value={formatNumber(graph.consumers)}
                    helper="Current subscriptions"
                  />
                  <Metric
                    label="Delivery issues"
                    value={formatNumber(selectedTopic.pending + selectedTopic.error)}
                    helper={`${formatNumber(selectedTopic.pending)} pending · ${formatNumber(selectedTopic.error)} errors`}
                  />
                </div>

                <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--surface-inset)] px-4 py-2.5 text-sm font-medium text-[var(--text-muted)]">
                  <p>Publishers</p>
                  <p className="text-center">Selected topic</p>
                  <p className="text-right">Consumer groups</p>
                </div>
                <div className="h-[520px] bg-[var(--topology-canvas)]">
                  <ReactFlow<PulseFlowNode>
                    key={`${selectedTopic.id}-${compactGraph ? 'compact' : 'wide'}`}
                    nodes={graph.nodes}
                    edges={graph.edges}
                    nodeTypes={nodeTypes}
                    fitView={!compactGraph}
                    fitViewOptions={{padding: 0.2, maxZoom: 1}}
                    defaultViewport={
                      compactGraph ? {x: -250, y: 48, zoom: 0.82} : {x: 0, y: 0, zoom: 1}
                    }
                    minZoom={0.35}
                    maxZoom={1.5}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    proOptions={{hideAttribution: true}}
                  >
                    <Background
                      variant={BackgroundVariant.Dots}
                      gap={22}
                      size={1}
                      color="var(--topology-grid)"
                    />
                    <Controls showInteractive={false} position="bottom-left" />
                  </ReactFlow>
                </div>

                <div className="border-t border-[var(--border)] px-5 py-3">
                  <p className="text-pretty text-base text-[var(--text-subtle)] sm:text-sm">
                    Publisher names come from the publishing Pulse instance, with common event
                    headers as a fallback for legacy events. “Unknown publisher” means the event did
                    not retain a source identity.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex min-h-[640px] flex-col items-center justify-center p-8 text-center">
                <MessageSquareText className="size-5 stroke-[var(--text-subtle)]" />
                <h2 className="mt-4 text-base font-semibold">Choose a topic</h2>
                <p className="mt-2 max-w-sm text-pretty text-base text-[var(--text-muted)] sm:text-sm">
                  Select a topic from the list to inspect its publishers and consumer groups.
                </p>
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  )
}
