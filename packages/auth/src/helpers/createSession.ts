import {Collection, ModelToDocumentTypeWithoutId} from '@orion-js/mongodb'
import {generateId} from '@orion-js/helpers'
import {getOptions} from '../optionsStore'
import {AbstractSession} from '../Sessions/Model'
import {User} from '../types'

const hasEmailsVerified = function (user) {
  if (!user.emails) return true
  for (const email of user.emails) {
    if (!email.verified) return false
  }
  return true
}

export default async function (user, viewer) {
  const {
    Sessions,
    onCreateSession,
    customCreateSession
  }: {
    Sessions: Collection<AbstractSession>
    onCreateSession: (session: AbstractSession, viewer: any) => Promise<any>
    customCreateSession: (user: User, viewer: any) => Promise<AbstractSession>
  } = getOptions()

  if (!user) throw new Error('User not found')

  let session: any = {}
  if (customCreateSession) {
    session = await customCreateSession(user, viewer)
  } else {
    session = {
      publicKey: generateId() + generateId(),
      secretKey: generateId() + generateId() + generateId() + generateId(),
      createdAt: new Date(),
      nonce: {default: '0'},
      lastCall: new Date(),
      userId: user._id,
      locale: user.locale,
      roles: user.roles,
      emailVerified: hasEmailsVerified(user)
    }
    session._id = await Sessions.insertOne(session)
  }

  if (onCreateSession) {
    await onCreateSession(session, viewer)
  }

  return session
}
