const disconnect = require('../database/disconnect')

module.exports = async function() {
  await disconnect()
  await global.MONGOD.stop()
  setTimeout(() => process.exit(), 100)
}
