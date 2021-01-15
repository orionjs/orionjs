import getSession from './getSession'
import getSignature from './getSignature'

export default function (body, getHeaders = () => {}) {
  const session = getSession()
  const headers = getHeaders(body)
  if (!session) return {...headers}

  const {publicKey, secretKey} = session
  if (!publicKey || !secretKey) return {...headers}

  const nonce = new Date().getTime()
  const signature = getSignature(nonce + body, session)

  return {
    'X-ORION-NONCE': nonce,
    'X-ORION-PUBLICKEY': publicKey,
    'X-ORION-SIGNATURE': signature,
    ...headers
  }
}
