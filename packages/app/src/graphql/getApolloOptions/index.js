import buildSchema from '../buildSchema'
import formatError from './formatError'

export default async function({models, controllers}) {
  const schema = await buildSchema({models, controllers})

  return {
    endpointURL: '/graphql',
    schema,
    formatError
  }
}
