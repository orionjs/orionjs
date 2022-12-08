import {ValidationError} from '@orion-js/schema'

export const wrapErrors = async <TFunc extends () => Promise<any>>(
  operation: TFunc
): Promise<ReturnType<TFunc>> => {
  try {
    return await operation()
  } catch (error) {
    if (error.code === 11000) {
      const regex = /index: (?:.*\.)?\$?(?:([_a-z0-9]*)(?:_\d*)|([_a-z0-9]*))\s*dup key/i
      const match = error.message.match(regex)

      if (!match) {
        throw new ValidationError({
          unknownKey: 'notUnique'
        })
      }

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
