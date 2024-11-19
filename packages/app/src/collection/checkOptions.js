import ConfigurationError from '../Errors/ConfigurationError'

export default function (options) {
  if (!options.name) {
    throw new ConfigurationError('Collection name is required')
  }

  if (options.model && options.model.schema) {
    if (!options.model.schema._id || options.model.schema._id.type !== 'ID') {
      throw new ConfigurationError(
        'Field _id type "ID" on schema is required in collection ' + name
      )
    }
  }
}
