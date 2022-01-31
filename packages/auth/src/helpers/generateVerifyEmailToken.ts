import {generateId} from '@orion-js/helpers'
import {Collection} from '@orion-js/mongodb'
import {User} from '../types'

export default async function (user: User, Users: Collection, email?) {
  if (!email) {
    email = await user.email()
  }

  const token = generateId()
  const data = {
    date: new Date(),
    email,
    token
  }

  Users.updateOne(user, {$set: {'services.emailVerify': data}})

  return token
}
