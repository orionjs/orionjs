import {generateId} from '@orion-js/app'
import {getOptions} from '../optionsStore'

const hasEmailsVerified = function (user) {
  if (!user.emails) return true
  for (const email of user.emails) {
    if (!email.verified) return false
  }
  return true
}

export default async function (user, viewer) {
  const {Sessions, onCreateSession, customCreateSession} = getOptions()

  if (!user) throw new Error('User not found')

  let session = {}
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
    session._id = await Sessions.insert(session)
  }

  if (onCreateSession) {
    await onCreateSession(session, viewer)
  }

  return session
}
