export default function({validate, clean}) {
  return {
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
