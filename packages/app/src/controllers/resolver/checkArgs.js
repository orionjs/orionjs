import {validate} from '@orion-js/schema'
import ConfigurationError from '../../Errors/ConfigurationError'

export default async function(params, ...args) {
  if (args.length < 2) {
    throw new ConfigurationError('Resolver must be called with 2 arguments at least')
  }
  const callParams = args[args.length - 2]
  const viewer = args[args.length - 1]
  await validate(params, callParams, viewer)
}
