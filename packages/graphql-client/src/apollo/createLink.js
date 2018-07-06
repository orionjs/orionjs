import {ApolloLink, split} from 'apollo-link'
import createBatchHttpLink from './createBatchHttpLink'
import onError from './onError'
import createWsLink from './createWsLink'
import {getMainDefinition} from 'apollo-utilities'

export default function(options) {
  const links = [onError]

  if (options.useSubscriptions) {
    const httpLink = createBatchHttpLink(options)
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
    links.push(createBatchHttpLink(options))
  }

  return ApolloLink.from(links)
}
