import ConfigurationError from '../Errors/ConfigurationError'

export default function(resolvers) {
  if (!resolvers) return
  Object.values(resolvers).forEach(resolver => {
    if (resolver.mutation && !resolver.private) {
      throw new ConfigurationError('Model mutation resolvers must be private')
    }
  })
}
