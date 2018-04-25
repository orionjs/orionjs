import doValidation from './doValidation'

export default async function(schema, doc) {
  const errors = []

  const addError = function(keys, code) {
    errors.push({
      key: keys.join('.'),
      code
    })
  }

  await doValidation({
    schema,
    doc,
    value: doc,
    currentSchema: {type: schema},
    addError
  })

  return errors
}
