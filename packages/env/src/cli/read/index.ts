import { getVariables } from '../../environment/getVariables'
import { getConfig } from '../add/getConfig'

export default async function envRead({path, key, secret}) {
  if (!path) {
    path = '.env.local.yml'
  }
  if (!secret) {
    throw new Error('Secret is required')
  }

  const config = getConfig(path)
  const variables = getVariables(config, secret)

  if (key) {
    console.log(variables[key])
  } else {
    console.log(JSON.stringify(variables, null, 2))
  }
}
