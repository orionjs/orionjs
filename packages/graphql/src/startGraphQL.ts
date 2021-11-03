import startGraphiQL from './startGraphiQL'
import getApolloOptions from './getApolloOptions'
import startWebsocket from './startWebsocket'
import {runHttpQuery, convertNodeHttpToRequest, isHttpQueryError} from 'apollo-server-core'
import {registerRoute, route} from '@orion-js/http'
import {StartGraphQLOptions} from './types/startGraphQL'

export default async function (options: StartGraphQLOptions) {
  const apolloOptions = await getApolloOptions(options)
  if (options.useGraphiql) {
    startGraphiQL(apolloOptions, options)
  }

  if (options.subscriptions) {
    startWebsocket(apolloOptions, options)
  }

  registerRoute(
    route({
      method: 'post',
      path: '/graphql',
      bodyParser: 'json',
      async resolve(req, res, viewer) {
        try {
          const executeQuery = async () => {
            return await runHttpQuery([req, res], {
              method: req.method,
              options: {...apolloOptions, context: viewer},
              query: req.method === 'POST' ? req.body : req.query,
              request: convertNodeHttpToRequest(req)
            })
          }

          if (options.executeGraphQLCache) {
            try {
              const result = await options.executeGraphQLCache(req, res, viewer, () =>
                executeQuery().then(r => r.graphqlResponse)
              )
              if (result) {
                return {
                  body: result,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              }
            } catch (error) {
              console.log('Error executing GraphQL cache:', error)
            }
          }

          const {graphqlResponse, responseInit} = await executeQuery()

          return {
            body: graphqlResponse,
            headers: responseInit.headers,
            statusCode: responseInit.status || 200
          }
        } catch (error) {
          if (!isHttpQueryError(error)) {
            throw error
          }

          return {
            headers: error.headers,
            statusCode: error.statusCode,
            body: error.message
          }
        }
      }
    })
  )
}
