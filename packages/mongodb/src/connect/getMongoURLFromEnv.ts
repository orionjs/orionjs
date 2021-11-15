export const getMongoURLFromEnv = (connectionName: string): string => {
  if (connectionName === 'main') {
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL is required')
    }
    return process.env.MONGO_URL
  }

  const name = `MONGO_URL_${connectionName.toUpperCase()}`
  const uri = process.env[name]
  if (!uri) {
    throw new Error(
      `To use the connection "${connectionName}" you must initialize it first calling getMongoConnection({name: "${connectionName}", uri: "MONGOURI"}) or setting the environment variable ${name}.`
    )
  }

  return uri
}
