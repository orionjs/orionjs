import ConfigurationError from '../Errors/ConfigurationError'

export default function({model, name}) {
  if (!name) {
    throw new ConfigurationError('Collection name is required')
  }

  if (model && model.schema) {
    if (!model.schema._id || model.schema._id.type !== 'ID') {
      throw new ConfigurationError(
        'Field _id type "ID" on schema is required in collection ' + name
      )
    }
  }

  if (global.db[name]) {
    throw new ConfigurationError(`Collection with name "${name}" already exists`)
  }
}
