import {onError} from 'apollo-link-error'
import setSession from '../auth/setSession'
import getSession from '../auth/getSession'

export default options =>
  onError(({graphQLErrors, networkError, response, operation}) => {
    // console.error('on error')
    if (graphQLErrors) {
      // console.error(graphQLErrors)
    }
    if (networkError) {
      if (networkError.statusCode === 400 && networkError.result.error === 'AuthError') {
        const session = getSession()
        console.log('Resetting session', session)
        if (session) {
          setSession(null)
        }
      } else {
        console.warn('Network error:', networkError)
      }
    }
  })
