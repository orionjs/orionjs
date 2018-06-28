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
    clean(value, info = {}) {
      if (!info.options) {
        info.options = {}
      }
      if (clean) {
        return clean(value, info)
      }
      return value
    },
    _isFieldType: true
  }
}
