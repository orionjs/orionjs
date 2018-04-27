export default function({name, validate, clean, ...otherFields}) {
  return {
    ...otherFields,
    name,
    validate(value, info = {}) {
      if (!info.currentSchema) {
        info.currentSchema = {}
      }
      return validate(value, info)
    },
    clean,
    _isFieldType: true
  }
}
