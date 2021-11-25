import {ApolloLink, split} from '@apollo/client'
import createHttpLink from './createHttpLink'
import onError from './onError'
import createWsLink from './createWsLink'
import {getMainDefinition} from 'apollo-utilities'
import {OperationDefinitionNode} from 'graphql'
import isSsrMode from './isSsrMode'

const isOperationDefinition = (definition): definition is OperationDefinitionNode => {
  return definition && definition.kind === 'OperationDefinition'
}

export default function createLink(options) {
  const links = [onError(options)]
  const ssrMode = isSsrMode(options)

  if (options.useSubscriptions && !ssrMode) {
    const httpLink = createHttpLink(options)
    const wsLink = createWsLink(options)
    const link = split(
      ({query}) => {
        const definition = getMainDefinition(query)
        if (!isOperationDefinition(definition)) {
          return false
        }
        const {kind, operation} = definition
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
