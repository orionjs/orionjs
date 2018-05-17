import {ValidationError} from '@orion-js/schema'

export default function(func) {
  return async (...args) => {
    try {
      return await func(...args)
    } catch (error) {
      if (error.code === 11000) {
        const regex = /index: (?:.*\.)?\$?(?:([_a-z0-9]*)(?:_\d*)|([_a-z0-9]*))\s*dup key/i
        const match = error.message.match(regex)
        const indexNameText = match[1] || match[2]
        const names = indexNameText.split(/_[_a-z0-9]_/)
        const errors = {}
        for (const name of names) {
          errors[name] = 'notUnique'
        }
        throw new ValidationError(errors)
      }

      throw error
    }
  }
}
