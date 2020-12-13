import setSession from '../auth/setSession'
import getSession from '../auth/getSession'

export default function (networkError) {
  if (networkError.statusCode === 401 && networkError.result.error === 'AuthError') {
    const {message} = networkError.result
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
