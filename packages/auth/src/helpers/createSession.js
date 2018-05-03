import {generateId} from '@orion-js/app'

export default async function({userId, Sessions}) {
  const session = {
    publicKey: generateId() + generateId(),
    secretKey: generateId() + generateId() + generateId() + generateId(),
    createdAt: new Date(),
    nonce: '0',
    lastCall: new Date(),
    userId: userId
  }
  const sessionId = await Sessions.insert(session)
  session._id = sessionId
  return session
}
