import {decrypt} from '../crypto'

export interface Config {
  version: string
  publicKey: string
  cleanKeys: {
    [key: string]: string
  }
  encryptedKeys: {
    [key: string]: string
  }
  readFromSecret?: {
    [key: string]: string[]
  }
}

export interface Variables {
  [key: string]: string
}

function readSecrets(readFromSecret): {variables: Variables; secretKey: string} {
  const variables: Variables = {}
  let secretKey = null
  if (!readFromSecret) return {variables, secretKey}
  for (const secretName in readFromSecret) {
    const keys = readFromSecret[secretName]
    if (!process.env[secretName]) {
      console.warn(
        `@orion/env could not find the secret "${secretName}" in the environment. Related variables will be undefined.`
      )
      continue
    }

    try {
      const values = JSON.parse(process.env[secretName])
      if (values.ORION_ENV_SECRET_KEY) {
        secretKey = values.ORION_ENV_SECRET_KEY
      }
      for (const key of keys) {
        if (values[key]) {
          variables[key] = values[key]
        } else {
          console.warn(
            `@orion/env could not find the variable "${key}" in the secret "${secretName}". Related variables will be undefined.`
          )
        }
      }
    } catch (error) {
      console.warn(
        `'@orion/env found a the secret "${secretName}" variable in the environment but it is not a valid JSON. Related variables will be undefined.'`
      )
    }
  }
  return {variables, secretKey: secretKey}
} 

export function getVariables(config: Config, secretKey?: string): Variables {
  const {cleanKeys, encryptedKeys, readFromSecret} = config
  const {variables, secretKey: foundSecretKey} = readSecrets(readFromSecret)
  let decryptKey = foundSecretKey || secretKey
  if (!decryptKey) {
    throw new Error(
      'Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not defined'
    )
  }

  for (const key in cleanKeys) {
    const value = cleanKeys[key]
    variables[key] = value
  }

  for (const key in encryptedKeys) {
    const encrypted = encryptedKeys[key]
    try {
      variables[key] = decrypt(decryptKey, encrypted)
    } catch (error) {
      throw new Error(
        `Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not the right key for "${key}"`
      )
    }
  }
  return variables
}
