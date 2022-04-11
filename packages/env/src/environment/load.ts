import {getConfig} from '../cli/add/getConfig'
import {getVariables} from './getVariables'

export interface LoadEnvOptions {
  // Secret password used to decrypt the encrypted env file. Default: process.env.ORION_ENV_SECRET_KEY
  secretKey?: string
  // Location of the file to read. Default: process.env.ORION_ENV_FILE_PATH
  envFilePath?: string
  // Set to true to set the environment variables even if the variable was already set. Default: process.env.ORION_ENV_OVERRIDE
  override?: boolean
}

const defaultOptions: LoadEnvOptions = {
  secretKey: process.env.ORION_ENV_SECRET_KEY,
  envFilePath: process.env.ORION_ENV_FILE_PATH,
  override: !!process.env.ORION_ENV_OVERRIDE
}

export function loadEnv(passedOptions: LoadEnvOptions = {}) {
  const options = {...defaultOptions, ...passedOptions}
  const data = getConfig(options.envFilePath)
  const variables = getVariables(data, options.secretKey)

  for (const key in variables) {
    const variable = variables[key]

    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = variable
    } else {
      if (options.override) {
        process.env[key] = variable
      }

      if (options.override) {
        console.log(`"${key}" is already defined in \`process.env\` and WAS overwritten`)
      } else {
        console.log(`"${key}" is already defined in \`process.env\` and was NOT overwritten`)
      }
    }
  }
}
