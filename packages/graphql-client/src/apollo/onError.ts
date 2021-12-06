import {onError} from '@apollo/client/link/error'
import onNetworkError from './onNetworkError'
import handleTwoFactor from './handleTwoFactor'

export default options =>
  onError(({graphQLErrors, networkError, response, operation, forward}) => {
    // console.error('on error')
    if (graphQLErrors) {
      for (const graphQLError of graphQLErrors) {
        if (
          (graphQLError as any).error === 'PermissionsError' &&
          (graphQLError as any).type === 'needsTwoFactorCode'
        ) {
          if (options.promptTwoFactorCode) {
            return handleTwoFactor({
              options,
              operation,
              forward
            })
          }
        }
      }
      // console.error(graphQLErrors)
    }

    if (networkError) {
      const result = onNetworkError({networkError, operation, forward})
      if (result) return result
    }

    return options.onError({graphQLErrors, networkError, response, operation, forward})
  })
