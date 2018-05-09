import createPaginatedResolver from '../resolver/createPaginatedResolver'

export default ({name, collection, Model, listName}) => {
  return createPaginatedResolver({
    name: listName || collection.name,
    returns: Model,
    collection
  })
}
