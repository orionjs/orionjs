import {withClientState} from 'apollo-link-state'

export default function(options) {
  const session = options.getSession()
  const defaults = {
    orionjsSession: session
      ? {
          ...session,
          __typename: 'OrionJSSession'
        }
      : null
  }

  const state = withClientState({
    defaults,
    resolvers: {},
    cache: options.cache
  })

  return state
}
