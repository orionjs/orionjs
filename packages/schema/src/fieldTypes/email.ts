import fieldType from '../fieldType'
import {isNil} from 'rambdax'
import Errors from '../Errors'

export default fieldType<string>({
  name: 'email',
  validate(value, {currentSchema}) {
    if ((value === '' || isNil(value)) && !currentSchema.optional) {
      return Errors.REQUIRED
    }

    if (value && typeof value !== 'string') return Errors.NOT_A_STRING

    // eslint-disable-next-line
    const regex =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    if (value && !regex.test(value)) return Errors.NOT_AN_EMAIL
  },
  clean(value) {
    if (typeof value === 'string') {
      value = value.toLowerCase()
    }

    return value
  },
})
