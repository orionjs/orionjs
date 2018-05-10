import {generateId} from '@orion-js/app'

export default async function({user, Sessions}) {
  if (!user) throw new Error('User not found')
  const session = {
    publicKey: generateId() + generateId(),
    secretKey: generateId() + generateId() + generateId() + generateId(),
    createdAt: new Date(),
    nonce: '0',
    lastCall: new Date(),
    userId: user._id,
    locale: user.locale
  }
  const sessionId = await Sessions.insert(session)
  session._id = sessionId
  return session
}
