import setSession from '../auth/setSession'
import getSession from '../auth/getSession'
import handleJWTRefresh from './handleJWTRefresh'

export default function ({networkError, operation, forward}) {
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
