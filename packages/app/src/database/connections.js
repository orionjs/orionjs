const { MongoClient } = require('mongodb')
const getDbName = require('./getDbName')
import { EventEmitter } from 'events'
import config from '../config'
import { nextTick } from 'process'
class OrionMongoDatabase {
  constructor(mongoURL) {
    this.mongoURL = mongoURL
    this.connectionEvent = new EventEmitter()
    this.connectionEvent.setMaxListeners(200)
    this.state = 'disconnected'
    this.connecting = true
    this.client = null
    this.database = null
    this.configured = false
    this.timer = new setTimeout(() => {
      if (!this.configured) {
        throw new Error(`Connection to ${this.mongoURL} is needed but was not configured, please call connectToDatabase`)
      }
    }, 30000)
  }

  config(mongoURL, mongoOptions) {
    console.log('configuring', mongoURL)
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
    this.state = 'connecting'
    const client = await MongoClient.connect(this.mongoURL, { ...this.mongoOptions })
    const dbName = getDbName(this.mongoURL)
    this.client = client
    this.database = client.db(dbName)
    this.connecting = false
    this.state = 'connected'
    this.connectionEvent.emit('connected', this)
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