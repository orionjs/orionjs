import {logger} from '@orion-js/logger'
import {AWSEncryptionKeyOptions, ClientEncryption, KMSProviders, MongoClient, UUID} from 'mongodb'
import {getMongoURLFromEnv} from '../connect/getMongoURLFromEnv'

export async function getOrCreateEncryptionKey({
  keyAltName,
  kmsProvider,
  masterKey,
  connectionName = 'main',
  keyVaultDatabase = 'encryption',
  keyVaultCollection = '__keyVault',
  kmsProviders,
}: {
  keyAltName: string
  kmsProvider: keyof KMSProviders
  masterKey?: AWSEncryptionKeyOptions
  connectionName?: string
  keyVaultDatabase?: string
  keyVaultCollection?: string
  kmsProviders: KMSProviders
}): Promise<{key: UUID; keyVaultNamespace: string}> {
  const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`

  logger.info('Connecting to database to get or create the encryption key', {
    keyVaultNamespace,
    keyAltName,
  })
  const client = new MongoClient(getMongoURLFromEnv(connectionName))
  await client.connect()
  const db = client.db(keyVaultDatabase)
  const collection = db.collection(keyVaultCollection)
  await collection.createIndex(
    {keyAltName: 1},
    {unique: true, partialFilterExpression: {keyAltName: {$exists: true}}},
  )
  const clientEncryption = new ClientEncryption(client, {
    keyVaultNamespace,
    kmsProviders,
  })

  const key = await clientEncryption.getKeyByAltName(keyAltName)
  if (key) {
    logger.info('Key found on the key vault', {
      keyVaultNamespace,
      keyAltName,
      UUID: key._id,
    })
    return {key: key._id, keyVaultNamespace}
  }

  logger.info('Key not found on the key vault, creating a new one', {
    keyVaultNamespace,
    keyAltName,
  })

  const newKey = await clientEncryption.createDataKey(kmsProvider, {
    keyAltNames: [keyAltName],
    ...(masterKey ? {masterKey} : {}),
  })

  logger.info('New encryption key created', {
    keyVaultNamespace,
    keyAltName,
    UUID: newKey,
  })

  return {key: newKey, keyVaultNamespace}
}

export const ENCRYPTION_ALGORITHMS = {
  DETERMINISTIC: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
  RANDOM: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
}
