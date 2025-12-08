import YAML from 'yaml'
import {decrypt, encrypt, generateKeys} from '../../crypto'
import {Config} from '../../environment/getVariables'
import {writeFile} from '../../files'
import {getConfig} from '../add/getConfig'
import prompts from 'prompts'

interface MigrateOptions {
  path?: string
  secret?: string
}

/**
 * Migrates an env config file to a new keypair.
 * Re-encrypts all encrypted keys with the new public key.
 */
export default async function envMigrate({path, secret}: MigrateOptions) {
  if (!path) {
    path = '.env.local.yml'
  }

  const config = getConfig(path)

  // Get the current secret key if not provided
  const currentSecret = secret ?? (await promptForSecret())

  // Decrypt all encrypted keys using the old secret
  const decryptedKeys = decryptAllKeys(config.encryptedKeys, currentSecret)

  // Generate a new keypair
  const newKeypair = generateKeys()

  // Re-encrypt all keys with the new public key
  const newEncryptedKeys = reEncryptAllKeys(decryptedKeys, newKeypair.encryptKey)

  // Create the updated config
  const updatedConfig: Config = {
    ...config,
    publicKey: newKeypair.encryptKey,
    encryptedKeys: newEncryptedKeys,
  }

  // Write the updated config file
  const text = YAML.stringify(updatedConfig)
  writeFile(path, text)

  console.log('')
  console.log('Config file migrated successfully.')
  console.log('')
  console.log('New secret key (save this securely):')
  console.log('')
  console.log(newKeypair.decryptKey)
  console.log('')
}

async function promptForSecret(): Promise<string> {
  const response = await prompts({
    type: 'password',
    name: 'secret',
    message: 'Current secret key',
  })

  if (!response.secret) {
    throw new Error('Secret is required')
  }

  return response.secret as string
}

function decryptAllKeys(
  encryptedKeys: Record<string, string>,
  secretKey: string,
): Record<string, string> {
  const decrypted: Record<string, string> = {}

  for (const key in encryptedKeys) {
    try {
      decrypted[key] = decrypt(secretKey, encryptedKeys[key])
    } catch (error) {
      throw new Error(`Failed to decrypt key "${key}". Is the secret key correct?`)
    }
  }

  return decrypted
}

function reEncryptAllKeys(
  decryptedKeys: Record<string, string>,
  newPublicKey: string,
): Record<string, string> {
  const encrypted: Record<string, string> = {}

  for (const key in decryptedKeys) {
    encrypted[key] = encrypt(newPublicKey, decryptedKeys[key])
  }

  return encrypted
}

