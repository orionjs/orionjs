import {generateId} from '@orion-js/app'

export default async function(user) {
  const code = generateId(6).toLowerCase()
  const token = generateId()

  const data = {
    date: new Date(),
    code,
    token
  }

  user.update({$set: {'services.loginCode': data}})

  return {token, code}
}
