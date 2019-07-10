import {ValidationError} from '@orion-js/schema'
import {DateTime} from 'luxon'

const maxTries = 6

export default async function({user, token, code}) {
  const {loginCode} = user.services
  if (!loginCode) {
    throw new ValidationError({code: 'incorrectLoginCode'})
  }

  if (loginCode.incorrectTries >= maxTries) {
    throw new ValidationError({code: 'loginCodeLocked'})
  }

  if (loginCode.token !== token) {
    throw new ValidationError({code: 'incorrectLoginCodeToken'})
  }

  if (loginCode.code !== code) {
    const count = loginCode.incorrectTries + 1 || 1
    await user.update({$set: {'services.loginCode.incorrectTries': count}})
    if (count >= maxTries) {
      throw new ValidationError({code: 'loginCodeLocked'})
    }
    throw new ValidationError({code: 'incorrectLoginCode'})
  }

  const lastDate = DateTime.fromJSDate(loginCode.date)

  const date = DateTime.local()
    .minus({minutes: 5})
    .toJSDate()
  if (lastDate < date) {
    throw new ValidationError({code: 'loginCodeExpired'})
  }
}
