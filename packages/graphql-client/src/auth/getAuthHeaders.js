import getSession from './getSession'
import getSignature from './getSignature'
import getJWT from './getJWT'

export default function (body, getHeaders = () => {}) {
  const jwt = getJWT()
  const headers = getHeaders(body)

  if (jwt) {
    return {
      'X-ORION-JWT': jwt,
      ...headers
    }
  }

  const session = getSession()
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
