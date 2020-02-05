import {generateId} from '@orion-js/app'
import {getOptions} from '../optionsStore'

const hasEmailsVerified = function(user) {
  if (!user.emails) return true
  for (const email of user.emails) {
    if (!email.verified) return false
  }
  return true
}

export default async function(user, viewer) {
  const {Sessions, onCreateSession} = getOptions()

  if (!user) throw new Error('User not found')

  const session = {
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

  const sessionId = await Sessions.insert(session)
  session._id = sessionId

  if (onCreateSession) {
    await onCreateSession(session, viewer)
  }

  return session
}
