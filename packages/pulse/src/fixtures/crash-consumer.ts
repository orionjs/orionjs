import {connect} from '../index'

const connectionString = process.env.PULSE_TEST_CONNECTION_STRING
const databaseName = process.env.PULSE_TEST_DATABASE_NAME
const topic = process.env.PULSE_TEST_TOPIC
const consumerGroup = process.env.PULSE_TEST_CONSUMER_GROUP

if (!connectionString || !databaseName || !topic || !consumerGroup) {
  throw new Error('Missing Pulse crash-consumer test configuration.')
}

const pulse = connect({
  connectionString,
  databaseName,
  consumerGroup,
  pollIntervalMs: 20,
  workerCount: 1,
  lockTimeoutMs: 200,
  discoveryLockTimeoutMs: 200,
  eventRetentionMs: null,
  historyRetentionMs: null,
  onError: () => {},
})

await pulse.awaitConnection()
await pulse.subscribe(
  topic,
  async () => {
    await new Promise(() => {})
  },
  {
    offsetReset: 'earliest',
    delivery: 'at-least-once',
    maxRetries: 3,
    retryDelayMs: 10,
    retryBackoffMultiplier: 2,
  },
)

await new Promise(() => {})
