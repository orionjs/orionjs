import {Observable} from '@apollo/client'

export default function (getNewHeaders, {operation, forward}) {
  return new Observable(observer => {
    const promise = Promise.resolve(getNewHeaders())

    promise
      .then(newHeaders => {
        operation.setContext(({headers = {}}) => {
          return {
            headers: {...headers, ...newHeaders}
          }
        })
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
