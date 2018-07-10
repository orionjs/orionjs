import create from './create'
import read from './read'
import deleteResolver from './delete'
import update from './update'
import list from './list'

export default function crudResolvers({collection, ...otherOptions}) {
  const Model = collection.model
  const info = {
    collection,
    Model,
    ...otherOptions
  }
  return {
    [`create${Model.name}`]: create(info),
    [Model.name.toLowerCase()]: read(info),
    [`delete${Model.name}`]: deleteResolver(info),
    [`update${Model.name}`]: update(info),
    [otherOptions.listName || collection.name]: list(info)
  }
}
