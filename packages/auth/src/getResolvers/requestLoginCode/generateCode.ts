import {generateId} from '@orion-js/helpers'

export default async function (user, Users) {
  const chars = 'abcdefghjkmnopqrstuvwxyz'
  const code = generateId(6, chars)
  const token = generateId()

  const data = {
    date: new Date(),
    code,
    token
  }

  Users.updateOne(user, {$set: {'services.loginCode': data}})

  return {token, code}
}
