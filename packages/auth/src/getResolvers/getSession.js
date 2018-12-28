import JSSHA from 'jssha'
import parseInt from 'lodash/parseInt'
import isPlainObject from 'lodash/isPlainObject'
import {getOptions} from '../optionsStore'

export default async function({getBody, headers, nonceName = 'default'}) {
  const {Sessions} = getOptions()
  await Sessions.await() // wait till db is connected
  const body = await getBody()
  const nonce = parseInt(headers['x-orion-nonce'])
  const publicKey = headers['x-orion-publickey']
  const signature = headers['x-orion-signature']
  const twoFactorCode = headers['x-orion-twofactor'] || null

  if (!nonce || !publicKey || !signature) {
    return {twoFactorCode}
  }

  const session = await Sessions.findOne({publicKey})
  if (!session) {
    throw new Error('sessionNotFound')
  }

  if (!session.nonce || !isPlainObject(session.nonce)) {
    throw new Error('nonceIsInvalid')
  }

  if (session.nonce[nonceName] && nonce < parseInt(session.nonce[nonceName])) {
    throw new Error('nonceIsInvalid')
  }

  await Sessions.update(
    {publicKey},
    {
      $set: {
        [`nonce.${nonceName}`]: String(nonce),
        lastCall: new Date()
      }
    }
  )

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
    twoFactorCode,
    locale: session.locale,
    roles: session.roles || [],
    emailVerified: session.emailVerified
  }
}
