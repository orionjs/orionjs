export default function({model, name}) {
  if (!name) {
    throw new Error('Collection name is required')
  }
  if (!model) {
    throw new Error('Model is required in ' + name)
  }

  if (!model.schema) {
    throw new Error('Model schema is required in ' + name)
  }

  if (!model.schema._id || model.schema._id.type !== 'ID') {
    throw new Error('Field _id type "ID" on schema is required in ' + name)
  }
}
