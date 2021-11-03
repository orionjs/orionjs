const {disconnect} = require('@orion-js/app')
const includes = require('lodash/includes')

module.exports = async function () {
  await disconnect()
  await global.MONGOD.stop()
  if (!includes(process.argv, '--watch')) {
    setTimeout(() => process.exit(), 100)
  }
}
