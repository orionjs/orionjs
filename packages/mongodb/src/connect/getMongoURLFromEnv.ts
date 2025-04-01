import {getExistingConnection} from './connections'
import {internalGetEnv} from '@orion-js/env'

export const getMongoURLFromEnv = (connectionName: string): string => {
  if (connectionName === 'main') {
    if (!internalGetEnv('mongo_url', 'MONGO_URL')) {
      throw new Error('MONGO_URL is required')
    }
    return internalGetEnv('mongo_url', 'MONGO_URL')
  }

  const envName = `mongo_url_${connectionName.toLowerCase()}`
  const processEnvName = `MONGO_URL_${connectionName.toUpperCase()}`
  const uri = getExistingConnection(connectionName)?.uri ?? internalGetEnv(envName, processEnvName)
  if (!uri) {
    throw new Error(
      `To use the connection "${connectionName}" you must initialize it first calling getMongoConnection({name: "${connectionName}", uri: "MONGOURI"}) or setting the environment variable ${processEnvName}.`,
    )
  }

  return uri
}

export const requiresExplicitSetup = (connectionName: string): boolean => {
  if (connectionName === 'main') {
    return internalGetEnv('mongo_explicit_setup', 'MONGO_EXPLICIT_SETUP') === 'true'
  }

  const envName = `mongo_explicit_setup_${connectionName.toLowerCase()}`
  const processEnvName = `MONGO_EXPLICIT_SETUP_${connectionName.toUpperCase()}`
  return internalGetEnv(envName, processEnvName) === 'true'
}
