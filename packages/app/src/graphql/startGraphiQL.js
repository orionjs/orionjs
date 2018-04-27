import * as GraphiQL from 'apollo-server-module-graphiql'
import route from '../route'

export default function(options) {
  route('/graphiql', async function({query, request}) {
    const graphiqlString = await GraphiQL.resolveGraphiQLString(query, options, request)
    return graphiqlString
  })
}
