const { MongoClient } = require('mongodb')
const getDbName = require('./getDbName')
import { EventEmitter } from 'events'
import { nextTick } from 'process'
import config from '../config'

class OrionMongoDatabase {
  constructor(mongoURL) {
    this.mongoURL = mongoURL
    this.connectionEvent = new EventEmitter({})
    this.connectionEvent.setMaxListeners(Infinity)
    this.state = 'disconnected'
    this.connecting = true
    this.client = null
    this.database = null
    this.configured = false
    this.encrypted = {
      client: null,
      database: null
    }
    this.timer = setTimeout(() => {
      if (!this.configured) {
        const { logger } = config()
        logger.error(`Connection to ${this.mongoURL} is needed but was not configured, call connectToDatabase first`)
      }
    }, 30 * 1000) // Warns if a collection used this connection but is not configured after 30 seconds
  }

  config(mongoURL, mongoOptions) {
    this.mongoURL = mongoURL
    this.mongoOptions = mongoOptions
    this.configured = true
  }

  async awaitForConnection() {
    if (this.state === 'connected') {
      return this
    } else if (this.state === 'connecting' || !this.configured) {
      return new Promise(resolve => this.connectionEvent.once('connected', resolve))
    }
    const { logger } = config()
    const censoredURL = this.mongoURL.replace(/\/\/.*:.*@/, '//') // remove user and password from URL
    this.state = 'connecting'
    if (this.mongoOptions?.autoEncryption) {
      this.encrypted.client = await MongoClient.connect(this.mongoURL, { ...this.mongoOptions })
      this.encrypted.database = this.encrypted.client.db(getDbName(this.mongoURL))
      logger.info(`An encrypted connection was created for ${censoredURL}`)
    }
    this.client = await MongoClient.connect(this.mongoURL, { ...this.mongoOptions, autoEncryption: null })
    this.database = this.client.db(getDbName(this.mongoURL))
    this.connecting = false
    this.state = 'connected'
    this.connectionEvent.emit('connected', this)
    logger.info(`Connected to ${censoredURL}`)
    nextTick(() => {
      delete this.connectionEvent
      clearTimeout(this.timer)
    })
    return this
  }

}

const connections = {}

async function createNewConnection(mongoURL, mongoOptions) {
  connections[mongoURL] = connections[mongoURL] || new OrionMongoDatabase(mongoURL)
  const connection = connections[mongoURL]
  if (connection.configured) throw new Error(`Connection already configured for ${mongoURL}`)
  connection.config(mongoURL, mongoOptions)
  return connection.awaitForConnection()
}

async function getExistingConnection(mongoURL) {
  connections[mongoURL] = connections[mongoURL] || new OrionMongoDatabase(mongoURL)
  return connections[mongoURL].awaitForConnection()
}


module.exports = {
  createNewConnection,
  getExistingConnection
}