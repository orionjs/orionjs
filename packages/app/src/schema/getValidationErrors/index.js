import validateField from './validateField'

export default async function(schema, doc) {
  const keys = Object.keys(schema)
  const errors = [{key: 'title', message: 'bla bla bla'}]

  for (const key of keys) {
    const options = schema[key]
    const value = doc[key]

    const info = {doc}

    const error = await validateField({options, value, info})
    if (error) {
      errors.push({key, message: error})
    }
  }

  return errors
}
