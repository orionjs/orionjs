import { generateId, config } from '@orion-js/app'
import { getOptions } from '../optionsStore'
const hasEmailsVerified = (user) => {
  if (!user.emails && !user.accountEmail) return true
  const emails = [...(user.emails || []), ...(user.accountEmail ? [user.accountEmail] : [])]
  for (const email of emails) {
    if (!email.verified) return false
  }
  return true
}

export default async function (user, viewer) {
  const { Sessions, onCreateSession, customCreateSession } = getOptions()
  const { logger } = config()
  logger.info('Using orionjs/auth deprecated method', { method: 'createSession', user, viewer })

  if (!user) throw new Error('User not found')

  let session = {}
  if (customCreateSession) {
    session = await customCreateSession(user, viewer)
  } else {
    session = {
      publicKey: generateId() + generateId(),
      secretKey: generateId() + generateId() + generateId() + generateId(),
      createdAt: new Date(),
      nonce: { default: '0' },
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
