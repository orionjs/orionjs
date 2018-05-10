import JSSHA from 'jssha'
import parseInt from 'lodash/parseInt'

export default ({Session, Sessions}) => {
  return async function({getBody, headers}) {
    const body = await getBody()
    const nonce = parseInt(headers['x-orion-nonce'])
    const publicKey = headers['x-orion-publickey']
    const signature = headers['x-orion-signature']

    if (!nonce || !publicKey || !signature) {
      return null
    }

    const session = await Sessions.findOne({publicKey})
    if (!session) {
      throw new Error('sessionNotFound')
    }

    if (nonce < parseInt(session.nonce)) {
      throw new Error('nonceIsInvalid')
    }

    await Sessions.update({publicKey}, {$set: {nonce: String(nonce)}})

    var shaObj = new JSSHA('SHA-512', 'TEXT')
    shaObj.setHMACKey(session.secretKey, 'TEXT')
    shaObj.update(nonce + body)
    const calculatedSignature = shaObj.getHMAC('HEX')

    if (signature !== calculatedSignature) {
      throw new Error('invalidSignature')
    }

    return {
      userId: session.userId,
      session,
      locale: session.locale
    }
  }
}
