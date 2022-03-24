import {connections} from './connections'
import {internalGetEnv} from '@orion-js/helpers'

export const getMongoURLFromEnv = (connectionName: string): string => {
  if (connectionName === 'main') {
    if (!internalGetEnv('mongo_url', 'MONGO_URL')) {
      throw new Error('MONGO_URL is required')
    }
    return internalGetEnv('mongo_url', 'MONGO_URL')
  }

  const envName = `mongo_url_${connectionName.toLowerCase()}`
  const processEnvName = `MONGO_URL_${connectionName.toUpperCase()}`
  const uri = connections[connectionName]?.uri ?? internalGetEnv(envName, processEnvName)
  if (!uri) {
    throw new Error(
      `To use the connection "${connectionName}" you must initialize it first calling getMongoConnection({name: "${connectionName}", uri: "MONGOURI"}) or setting the environment variable ${processEnvName}.`
    )
  }

  return uri
}
