import buildSchema from './buildSchema'

export default async function({models, controllers}) {
  const schema = await buildSchema({models, controllers})

  return {
    endpointURL: '/graphql',
    schema
  }
}
