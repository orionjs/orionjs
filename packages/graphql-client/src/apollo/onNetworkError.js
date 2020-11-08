import setSession from '../auth/setSession'
import getSession from '../auth/getSession'

export default function (networkError) {
  if (networkError.statusCode === 401 && networkError.result.error === 'AuthError') {
    if (networkError.result.message !== 'nonceIsInvalid') {
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
