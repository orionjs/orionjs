import {EventEmitter} from 'node:events'
import {MongoClient, Db, MongoClientOptions} from 'mongodb'
import getDBName from './getDBName'
import {nextTick} from 'node:process'
import {logger} from '@orion-js/logger'
import {sleep} from '@orion-js/helpers'
import {getMongoURLFromEnv} from './getMongoURLFromEnv'

export interface OrionMongoClient {
  client: MongoClient
  db: Db
  uri: string
  dbName: string
  /**
   * @deprecated Use startConnection() instead. This property is not guaranteed to be resolved if the connection is not started.
   * When using async calls startConnection or connectionPromise is no longer needed. Orion will automatically start the connection if it is not already started.
   * Kept for backwards compatibility. startConnection does not re-start the connection if it is already started, so it is safe to use.
   */
  connectionPromise: Promise<MongoClient>
  connectionName: string
  encrypted: {client: MongoClient; db: Db}
  /**
   * Starts the connection if it is not already started.
   * If the connection is already started, it resolves immediately.
   */
  startConnection: () => Promise<MongoClient>
  closeConnection: () => Promise<void>
}

// globalThis.myModuleMap ??= {}
export const connectionWrappers: {[key: string]: OrionMongoDatabaseWrapper} = {} //globalThis.myModuleMap

class OrionMongoDatabaseWrapper implements OrionMongoClient {
  uri: string
  dbName: string
  connectionName: string
  connectionPromise: Promise<MongoClient>
  private mongoOptions: MongoClientOptions
  private connectionEvent: EventEmitter = new EventEmitter()
  private state: 'disconnected' | 'connecting' | 'connected' | 'disconnecting' = 'disconnected'
  client: MongoClient
  db: Db
  configured = false
  readonly encrypted: {client: MongoClient; db: Db} = {client: null, db: null}
  readonly configTimeout: NodeJS.Timeout

  constructor(connectionName: string) {
    this.connectionName = connectionName

    this.connectionEvent.setMaxListeners(Number.POSITIVE_INFINITY)
    this.connectionPromise = new Promise((resolve, reject) => {
      if (this.state === 'connected') {
        resolve(this.client)
      }
      this.connectionEvent.once('connected', resolve)
      this.connectionEvent.once('error', reject)
    })
    this.configTimeout = setTimeout(() => {
      logger.error(
        'Connection was required but never configured, call configureConnection() or unset the env variable MONGO_EXPLICIT_SETUP',
        {
          connectionName,
        },
      )
      this.connectionEvent.emit('error', new Error('Connection was required but never configured'))
    }, 30 * 1000)
  }

  config(mongoURL: string, mongoOptions: MongoClientOptions) {
    this.uri = mongoURL
    this.mongoOptions = mongoOptions
    this.configured = true
    if (this.mongoOptions?.autoEncryption) {
      this.encrypted.client = new MongoClient(mongoURL, {
        retryReads: true,
        ...this.mongoOptions,
      })
      this.encrypted.db = this.encrypted.client.db(getDBName(this.uri))
    }
    this.client = new MongoClient(mongoURL, {
      retryReads: true,
      ...this.mongoOptions,
      autoEncryption: null,
    })
    this.db = this.client.db(getDBName(this.uri))
    clearTimeout(this.configTimeout)
  }

  async awaitConnection() {
    if (this.state === 'connected') return this
    if (this.state === 'connecting' || !this.configured) {
      // Wait for the connection to be configured and established
      await this.connectionPromise
      return this
    }
    this.state = 'connecting'
    // Remove user:password and protocol prefix (mongodb+srv:// or mongodb://) for logging
    const censoredURI = this.uri.replace(/\/\/.*:.*@/, '//').replace(/^mongodb(\+srv)?:\/\//, '')
    logger.info(`Starting MongoDB connection "${this.connectionName}" [${censoredURI}]`)
    if (this.encrypted.client) {
      await this.connectWithRetry(this.encrypted.client)
      logger.info('Successfully connected to encrypted mongo', {
        uri: censoredURI,
        connectionName: this.connectionName,
      })
    }
    await this.connectWithRetry(this.client)
    this.state = 'connected'
    this.connectionEvent.emit('connected', this.client)

    nextTick(() => {
      this.connectionEvent.removeAllListeners()
      this.connectionEvent = null
    })
    return this
  }

  async connectWithRetry(client: MongoClient) {
    try {
      return await client.connect()
    } catch (error) {
      logger.error('Error connecting to mongo. Will retry in 5s', {
        error,
        connectionName: this.connectionName,
      })
      await sleep(5000)
      return this.connectWithRetry(client)
    }
  }

  async startConnection() {
    return this.awaitConnection().then(() => this.client)
  }

  async closeConnection() {
    if (this.state === 'disconnected' || this.state === 'disconnecting') return
    this.state = 'disconnecting'
    await this.client?.close()
    await this.encrypted?.client?.close()
    this.state = 'disconnected'
  }
}

export function configureConnection(connectionName: string, mongoOptions: MongoClientOptions) {
  connectionWrappers[connectionName] =
    connectionWrappers[connectionName] || new OrionMongoDatabaseWrapper(connectionName)
  const connectionWrapper = connectionWrappers[connectionName]
  if (connectionWrapper.configured) {
    throw new Error('Connection already configured')
  }
  connectionWrapper.config(getMongoURLFromEnv(connectionName), mongoOptions)
  return connectionWrapper.awaitConnection()
}

export function getExistingConnection(connectionName: string) {
  connectionWrappers[connectionName] =
    connectionWrappers[connectionName] || new OrionMongoDatabaseWrapper(connectionName)

  return connectionWrappers[connectionName]
}

export const connections = connectionWrappers
