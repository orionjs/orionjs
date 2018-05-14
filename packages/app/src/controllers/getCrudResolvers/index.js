import create from './create'
import read from './read'
import deleteResolver from './delete'
import update from './update'
import list from './list'

export default function getCrudResolvers({collection, ...otherOptions}) {
  const info = {
    collection,
    Model: collection.model,
    ...otherOptions
  }
  return {
    create: create(info),
    read: read(info),
    delete: deleteResolver(info),
    update: update(info),
    list: list(info)
  }
}
