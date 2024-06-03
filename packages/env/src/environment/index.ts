import {getConfig} from '../cli/add/getConfig'
import {getVariables} from './getVariables'
export * from './getDts'
export * from './load'

export interface Variables {
  [key: string]: string
}

let variables: Variables = {}

const g = global as any

const secretKey = process.env.ORION_ENV_SECRET_KEY
const envFilePath = process.env.ORION_ENV_FILE_PATH

export const readEnv = () => {
  const data = getConfig(envFilePath)
  return getVariables(data, secretKey)
}

if (g.__orion_env_final__) {
  variables = g.__orion_env_final__
} else if (envFilePath) {
  variables = readEnv()
}

g.__orion_env_final__ = variables

const env = variables

export {env}
