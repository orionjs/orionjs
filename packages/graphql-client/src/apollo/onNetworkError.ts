import setSession from '../auth/setSession'
import getSession from '../auth/getSession'
import handleJWTRefresh from './handleJWTRefresh'

export interface OnNetworkErrorOptions {
  networkError: any
  operation?: any
  forward?: any
}

export default function onNetworkError({networkError, operation, forward}: OnNetworkErrorOptions) {
  if (networkError.statusCode === 401 && networkError.result.error === 'AuthError') {
    const {message} = networkError.result
    if (message.toLowerCase().includes('jwt')) {
      return handleJWTRefresh({networkError, operation, forward})
    }
    if (['sessionNotFound', 'invalidSignature'].includes(message)) {
      const session = getSession()
      console.log('Resetting session: ' + JSON.stringify(networkError.result, null, 2))
      if (session) {
        setSession(null, false)
      }
    } else {
      console.warn('Received too many nonce is invalid')
    }
  } else {
    console.warn('Network error:', networkError)
  }
}
