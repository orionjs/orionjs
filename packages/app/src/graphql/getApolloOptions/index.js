import buildSchema from '../buildSchema'
import formatError from './formatError'

export default async function({resolvers}) {
  const schema = await buildSchema({resolvers})

  return {
    endpointURL: '/graphql',
    schema,
    formatError
  }
}
