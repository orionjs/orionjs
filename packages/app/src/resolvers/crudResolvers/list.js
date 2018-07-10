import paginatedResolver from '../paginatedResolver'

export default ({name, collection, Model, paginatedOptions}) => {
  return paginatedResolver({
    returns: Model,
    collection,
    ...paginatedOptions
  })
}
