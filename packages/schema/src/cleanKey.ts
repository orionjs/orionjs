import clean from './clean'
import dotGetSchema from './dotGetSchema'

const defaultOptions = {
  filter: true
}

export default async function(schema, key, value, passedOptions = {}, ...args) {
  const options = {...defaultOptions, ...passedOptions}
  const keySchema = dotGetSchema(schema, key)

  if (!keySchema) {
    if (options.filter) {
      return
    } else {
      return value
    }
  }

  const result = await clean({clean: keySchema}, {clean: value}, options, ...args)
  return result.clean
}
