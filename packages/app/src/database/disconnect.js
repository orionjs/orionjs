module.exports = async function() {
  await global.orionMainDatabaseClient.close()
  global.orionMainDatabase = null
  global.orionMainDatabaseClient = null
}
