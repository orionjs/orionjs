import {SubscriptionClient} from 'subscriptions-transport-ws'
import getJWT from '../auth/getJWT'
import getSession from '../auth/getSession'
import getSignature from '../auth/getSignature'

const getConnectionParams = function () {
  let params = {}
  const session = getSession()
  const jwt = getJWT()
  if (jwt) {
    params = {
      jwt
    }
  } else if (session) {
    const {publicKey, secretKey} = session
    if (publicKey && secretKey) {
      const nonce = new Date().getTime()
      const signature = getSignature(nonce + 'websockethandshake', session)
      params = {
        nonce,
        publicKey,
        signature
      }
    }
  }
  return params
}

export default function (options) {
  const {endpointURL, subscriptionsPath} = options
  const uri = endpointURL.replace('http', 'ws') + subscriptionsPath

  const client = new SubscriptionClient(uri, {
    reconnect: true,
    lazy: true,
    reconnectionAttempts: 10,
    connectionParams: getConnectionParams,
    ...options.wsOptions
  })

  options.wsClient = client

  return client
}
