import createPaginatedResolver from '../resolver/createPaginatedResolver'

export default ({name, collection, Model, listName, paginatedOptions}) => {
  return createPaginatedResolver({
    name: listName || collection.name,
    returns: Model,
    collection,
    ...paginatedOptions
  })
}
