import Controller from '../Controller'
import create from './create'
import read from './read'
import deleteResolver from './delete'
import update from './update'
import list from './list'

export default function createCrudController({name, collection, ...otherOptions}) {
  const info = {
    name,
    collection,
    Model: collection.model,
    ...otherOptions
  }
  return new Controller({
    name,
    resolvers: {
      create: create(info),
      read: read(info),
      delete: deleteResolver(info),
      update: update(info),
      list: list(info)
    }
  })
}
