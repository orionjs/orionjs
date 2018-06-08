import {generateId} from '@orion-js/app'

export default async function(user, email) {
  if (!email) {
    email = await user.email()
  }

  const token = generateId()
  const data = {
    date: new Date(),
    email,
    token
  }

  user.update({$set: {'services.emailVerify': data}})

  return token
}
