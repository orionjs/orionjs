import {ApolloLink, split} from 'apollo-link'
import createHttpLink from './createHttpLink'
import onError from './onError'
import createWsLink from './createWsLink'
import {getMainDefinition} from 'apollo-utilities'

export default function(options) {
  const links = [onError(options)]

  if (options.useSubscriptions) {
    const httpLink = createHttpLink(options)
    const wsLink = createWsLink(options)
    const link = split(
      ({query}) => {
        const {kind, operation} = getMainDefinition(query)
        return kind === 'OperationDefinition' && operation === 'subscription'
      },
      wsLink,
      httpLink
    )
    links.push(link)
  } else {
    links.push(createHttpLink(options))
  }

  return ApolloLink.from(links)
}
