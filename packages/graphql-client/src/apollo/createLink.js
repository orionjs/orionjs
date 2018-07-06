import {ApolloLink} from 'apollo-link'
import batchHttpLink from './batchHttpLink'
import onError from './onError'
import createClientState from './createClientState'

export default function(options) {
  return ApolloLink.from([onError, batchHttpLink(options)])
}
