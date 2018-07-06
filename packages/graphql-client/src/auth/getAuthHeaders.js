import getSession from './getSession'
import getSignature from './getSignature'

export default function(body) {
  const session = getSession()
  if (!session) return {}
  const {publicKey, secretKey} = session
  if (!publicKey || !secretKey) return {}

  const nonce = new Date().getTime()
  const signature = getSignature(nonce + body, session)

  return {
    'X-ORION-NONCE': nonce,
    'X-ORION-PUBLICKEY': publicKey,
    'X-ORION-SIGNATURE': signature
  }
}
