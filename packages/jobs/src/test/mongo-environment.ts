const NodeEnvironment = require('jest-environment-node')

class MongoEnvironment extends NodeEnvironment {
  async setup() {
    this.global.MONGOD = global.MONGOD
    this.global.orionMainDatabase = global.orionMainDatabase
    this.global.orionMainDatabaseClient = global.orionMainDatabaseClient
    await super.setup()
  }

  async teardown() {
    await super.teardown()
  }

  runScript(script) {
    return super.runScript(script)
  }
}

module.exports = MongoEnvironment
