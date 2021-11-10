import {generateId} from '@orion-js/helpers'

export default async function (user) {
  const chars = 'abcdefghjkmnopqrstuvwxyz'
  const code = generateId(6, chars)
  const token = generateId()

  const data = {
    date: new Date(),
    code,
    token
  }

  user.update({$set: {'services.loginCode': data}})

  return {token, code}
}
