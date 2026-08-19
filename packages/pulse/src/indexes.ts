import type {
  Collection,
  CreateIndexesOptions,
  Db,
  IndexDescription,
  IndexDescriptionInfo,
} from 'mongodb'
import {PulseIndexError} from './errors'
import type {DeliveryDocument, EventDocument, SubscriptionDocument} from './types'

export interface PulseCollections {
  events: Collection<EventDocument>
  subscriptions: Collection<SubscriptionDocument>
  deliveries: Collection<DeliveryDocument>
}

interface ExpectedIndex {
  name: string
  aliases?: string[]
  key: Record<string, 1 | -1>
  unique?: boolean
  expireAfterSeconds?: number
  partialFilterExpression?: Record<string, unknown>
}

export const eventsTopicSequenceIndexKey = {topic: 1, sequence: 1, _id: 1} as const

export const subscriptionsGroupTopicIndexKey = {consumerGroup: 1, topic: 1} as const

export const deliveriesSequenceAcquisitionIndexKey = {
  consumerGroup: 1,
  topic: 1,
  status: 1,
  eventSequence: 1,
  eventId: 1,
} as const

export const deliveriesPendingIndexKey = {
  consumerGroup: 1,
  nextAttemptAt: 1,
  createdAt: 1,
  topic: 1,
} as const

export const deliveriesProcessingIndexKey = {
  consumerGroup: 1,
  lockedUntil: 1,
  topic: 1,
} as const

const eventsIndexes: ExpectedIndex[] = [
  {
    name: 'pulse_events_topic_sequence_id',
    key: eventsTopicSequenceIndexKey,
  },
  {
    name: 'pulse_events_expires_at_ttl',
    key: {expiresAt: 1},
    expireAfterSeconds: 0,
  },
]

const subscriptionsIndexes: ExpectedIndex[] = [
  {
    name: 'pulse_subscriptions_group_topic_unique',
    key: subscriptionsGroupTopicIndexKey,
    unique: true,
  },
  {
    name: 'pulse_subscriptions_discovery_lease',
    key: {consumerGroup: 1, discoveryLockedUntil: 1},
  },
]

const deliveriesIndexes: ExpectedIndex[] = [
  {
    name: 'pulse_deliveries_group_event_unique',
    key: {consumerGroup: 1, eventId: 1},
    unique: true,
  },
  {
    name: 'pulse_deliveries_acquisition',
    key: {consumerGroup: 1, topic: 1, status: 1, eventCreatedAt: 1, eventId: 1},
  },
  {
    name: 'pulse_deliveries_sequence_acquisition',
    key: deliveriesSequenceAcquisitionIndexKey,
  },
  {
    name: 'pulse_deliveries_concurrent_pending',
    aliases: ['pulse_deliveries_v2_pending'],
    key: deliveriesPendingIndexKey,
    partialFilterExpression: {status: 'v2-pending'},
  },
  {
    name: 'pulse_deliveries_concurrent_processing',
    aliases: ['pulse_deliveries_v2_processing'],
    key: deliveriesProcessingIndexKey,
    partialFilterExpression: {status: 'v2-processing'},
  },
  {
    name: 'pulse_deliveries_expires_at_ttl',
    key: {expiresAt: 1},
    expireAfterSeconds: 0,
  },
]

function isNamespaceExistsError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 48)
}

async function ensureCollection(db: Db, name: string) {
  const exists = await db.listCollections({name}, {nameOnly: true}).hasNext()
  if (exists) return

  try {
    await db.createCollection(name)
  } catch (error) {
    if (!isNamespaceExistsError(error)) throw error
  }
}

function normalizeKey(key: IndexDescriptionInfo['key'] | Record<string, 1 | -1>) {
  return Object.entries(key).map(([field, direction]) => [field, Number(direction)])
}

function describeIndex(index: ExpectedIndex | IndexDescriptionInfo) {
  return JSON.stringify({
    key: normalizeKey(index.key as Record<string, 1 | -1>),
    unique: Boolean(index.unique),
    expireAfterSeconds: 'expireAfterSeconds' in index ? index.expireAfterSeconds : undefined,
    sparse: 'sparse' in index ? Boolean(index.sparse) : false,
    hidden: 'hidden' in index ? Boolean(index.hidden) : false,
    partialFilterExpression:
      'partialFilterExpression' in index ? index.partialFilterExpression : undefined,
    collation: 'collation' in index ? index.collation : undefined,
  })
}

function validateIndex(
  collectionName: string,
  actual: IndexDescriptionInfo,
  expected: ExpectedIndex,
) {
  const actualKey = normalizeKey(actual.key)
  const expectedKey = normalizeKey(expected.key)
  const keysMatch = JSON.stringify(actualKey) === JSON.stringify(expectedKey)
  const uniqueMatches = Boolean(actual.unique) === Boolean(expected.unique)
  const ttlMatches = actual.expireAfterSeconds === expected.expireAfterSeconds
  const partialFilterMatches =
    JSON.stringify(actual.partialFilterExpression) ===
    JSON.stringify(expected.partialFilterExpression)
  const hasDefaultSemantics = !actual.sparse && !actual.hidden && actual.collation === undefined

  if (keysMatch && uniqueMatches && ttlMatches && partialFilterMatches && hasDefaultSemantics) {
    return
  }

  throw new PulseIndexError(
    `Pulse index "${expected.name}" on "${collectionName}" is incompatible. ` +
      `Expected ${describeIndex(expected)}, found ${describeIndex(actual)}.`,
  )
}

function toIndexDescription(index: ExpectedIndex): IndexDescription {
  const options: CreateIndexesOptions = {
    name: index.name,
    ...(index.unique ? {unique: true} : {}),
    ...(index.expireAfterSeconds !== undefined
      ? {expireAfterSeconds: index.expireAfterSeconds}
      : {}),
    ...(index.partialFilterExpression
      ? {partialFilterExpression: index.partialFilterExpression}
      : {}),
  }

  return {key: index.key, ...options}
}

async function ensureIndexes<T extends DocumentLike>(
  collection: Collection<T>,
  expectedIndexes: ExpectedIndex[],
) {
  let existing = await collection.listIndexes().toArray()
  const findExisting = (expected: ExpectedIndex) =>
    existing.find(
      index => index.name === expected.name || expected.aliases?.includes(index.name ?? ''),
    )

  for (const expected of expectedIndexes) {
    const actual = findExisting(expected)
    if (actual) validateIndex(collection.collectionName, actual, expected)
  }

  const missing = expectedIndexes.filter(expected => !findExisting(expected))
  if (missing.length > 0) {
    try {
      await collection.createIndexes(missing.map(toIndexDescription))
    } catch (error) {
      existing = await collection.listIndexes().toArray()
      const unresolved = missing.filter(
        expected =>
          !existing.some(
            item => item.name === expected.name || expected.aliases?.includes(item.name ?? ''),
          ),
      )
      if (unresolved.length > 0) {
        const mongoMessage = error instanceof Error ? error.message : String(error)
        throw new PulseIndexError(
          `Failed to create Pulse index${unresolved.length === 1 ? '' : 'es'} ` +
            `${unresolved.map(index => `"${index.name}"`).join(', ')} on ` +
            `"${collection.collectionName}". MongoDB: ${mongoMessage}`,
          {cause: error},
        )
      }
    }
  }

  existing = await collection.listIndexes().toArray()
  for (const expected of expectedIndexes) {
    const actual = existing.find(
      index => index.name === expected.name || expected.aliases?.includes(index.name ?? ''),
    )
    if (!actual) {
      throw new PulseIndexError(
        `Pulse index "${expected.name}" is missing from "${collection.collectionName}".`,
      )
    }
    validateIndex(collection.collectionName, actual, expected)
  }
}

type DocumentLike = {_id: string}

export async function createCollectionsAndIndexes(
  db: Db,
  collectionPrefix: string,
): Promise<PulseCollections> {
  const names = {
    events: `${collectionPrefix}.events`,
    subscriptions: `${collectionPrefix}.subscriptions`,
    deliveries: `${collectionPrefix}.deliveries`,
  }

  await Promise.all(Object.values(names).map(name => ensureCollection(db, name)))

  const collections: PulseCollections = {
    events: db.collection<EventDocument>(names.events),
    subscriptions: db.collection<SubscriptionDocument>(names.subscriptions),
    deliveries: db.collection<DeliveryDocument>(names.deliveries),
  }

  await Promise.all([
    ensureIndexes(collections.events, eventsIndexes),
    ensureIndexes(collections.subscriptions, subscriptionsIndexes),
    ensureIndexes(collections.deliveries, deliveriesIndexes),
  ])

  return collections
}
