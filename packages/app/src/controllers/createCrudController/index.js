import Controller from '../Controller'
import create from './create'
import read from './read'
import deleteResolver from './delete'
import update from './update'

export default function createCrudController({name, collection}) {
  const info = {
    name,
    collection,
    Model: collection.model
  }
  return new Controller({
    name,
    resolvers: {
      create: create(info),
      read: read(info),
      delete: deleteResolver(info),
      update: update(info)
    }
  })
}
