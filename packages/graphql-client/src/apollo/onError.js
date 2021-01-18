import {onError} from 'apollo-link-error'
import {Observable} from 'apollo-link'
import onNetworkError from './onNetworkError'

export default options =>
  onError(({graphQLErrors, networkError, response, operation, forward}) => {
    // console.error('on error')
    if (graphQLErrors) {
      for (const graphQLError of graphQLErrors) {
        if (
          graphQLError.error === 'PermissionsError' &&
          graphQLError.type === 'needsTwoFactorCode'
        ) {
          if (options.promptTwoFactorCode) {
            return new Observable(observer => {
              Promise.resolve(options.promptTwoFactorCode())
                .then(code => {
                  operation.setContext(({headers = {}}) => ({
                    headers: {
                      // Re-add old headers
                      ...headers,
                      // Switch out old access token for new one
                      'X-ORION-TWOFACTOR': code
                    }
                  }))
                })
                .then(() => {
                  const subscriber = {
                    next: observer.next.bind(observer),
                    error: observer.error.bind(observer),
                    complete: observer.complete.bind(observer)
                  }

                  // Retry last failed request
                  forward(operation).subscribe(subscriber)
                })
                .catch(error => {
                  // No refresh or client token available, we force user to login
                  observer.error(error)
                })
            })
          }
        }
      }
      // console.error(graphQLErrors)
    }

    if (networkError) {
      onNetworkError(networkError)
    }

    return options.onError({graphQLErrors, networkError, response, operation, forward})
  })
