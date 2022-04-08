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
}

export interface Variables {
  [key: string]: string
}

export function getVariables(config: Config, secretKey: string): Variables {
  const {cleanKeys, encryptedKeys} = config
  const variables: Variables = {}

  for (const key in cleanKeys) {
    const value = cleanKeys[key]
    variables[key] = value
  }

  for (const key in encryptedKeys) {
    const encrypted = encryptedKeys[key]
    try {
      variables[key] = decrypt(secretKey, encrypted)
    } catch (error) {
      throw new Error(
        `Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not the right key for "${key}"`
      )
    }
  }

  return variables
}
