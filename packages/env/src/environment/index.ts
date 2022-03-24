import {asymmetric} from '@orion-js/crypto'

const env = {}

const g = global as any

if (g.__orion_env__) {
  const secretKey = process.env.ORION_ENV_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not defined'
    )
  }
  const cleanKeys = g.__orion_env__.cleanKeys
  const encryptedKeys = g.__orion_env__.encryptedKeys

  for (const key in cleanKeys) {
    const value = cleanKeys[key]
    env[key] = value
  }

  for (const key in encryptedKeys) {
    const encrypted = encryptedKeys[key]
    try {
      env[key] = asymmetric.decrypt(secretKey, encrypted)
    } catch (error) {
      throw new Error(
        `Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not the right key for "${key}"`
      )
    }
  }
}

export {env}
