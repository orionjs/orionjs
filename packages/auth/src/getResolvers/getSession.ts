import JSSHA from 'jssha'
import parseInt from 'lodash/parseInt'
import isPlainObject from 'lodash/isPlainObject'
import {getOptions} from '../optionsStore'
import {express} from '@orion-js/http'

export default async function (req: express.Request) {
  const {headers} = req
  const {Sessions, omitNonceCheck} = getOptions()
  await Sessions.connectionPromise // wait till db is connected
  const nonce = Number(headers['x-orion-nonce'])
  const publicKey = headers['x-orion-publickey']
  const signature = headers['x-orion-signature']
  const twoFactorCode = headers['x-orion-twofactor'] || null
  const nonceName = 'default'

  if (!nonce || !publicKey || !signature) {
    return {twoFactorCode}
  }

  const session = await Sessions.findOne({publicKey})
  if (!session) {
    throw new Error('sessionNotFound')
  }

  if (!omitNonceCheck) {
    if (!session.nonce || !isPlainObject(session.nonce)) {
      throw new Error('nonceIsInvalid')
    }

    const savedNonce = session.nonce[nonceName] && parseInt(session.nonce[nonceName])

    if (savedNonce) {
      if (savedNonce >= nonce) {
        throw new Error('nonceIsInvalid')
      }
    }

    await Sessions.updateOne(
      {publicKey},
      {
        $set: {
          [`nonce.${nonceName}`]: String(nonce),
          lastCall: new Date()
        }
      }
    )
  }

  const body = req.body
  const shaObj = new JSSHA('SHA-512', 'TEXT')
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
