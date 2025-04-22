import { resolver, ConfigurationError, Model } from '@orion-js/app'
import speakeasy from 'speakeasy'
import qr from 'qr-image'
import getUserCollection from '../helpers/getUserCollection'
const model = new Model({
  name: 'QRSetupInformation',
  schema: {
    base32: {
      type: String
    },
    qrCode: {
      type: String
    }
  }
})

export default ({ Users, Session, twoFactor }) =>
  resolver({
    requireUserId: true,
    returns: model,
    mutation: true,
    resolve: async function generateTwoFactorSecret(params, viewer) {
      const UsersCollection = getUserCollection(Users)
      const user = await UsersCollection.findOne(viewer.userId)
      if (await user.hasTwoFactor()) {
        throw new Error('User has two factor')
      }

      const email = await user.email()
      const { base32 } = speakeasy.generateSecret()
      await Users.update(viewer.userId, {
        $set: {
          'services.twoFactor.base32': base32,
          'services.twoFactor.enabled': false
        }
      })

      const { issuer } = twoFactor

      if (!issuer) {
        throw new ConfigurationError('Two factor issuer is required in configuration')
      }

      const encoded = encodeURIComponent(`${issuer}:${email}`)
      const urlIssuer = encodeURIComponent(issuer)
      const url = `otpauth://totp/${encoded}?secret=${base32}&issuer=${urlIssuer}`

      const qrCode = qr.imageSync(url, { type: 'svg' })

      return {
        base32,
        qrCode
      }
    }
  })
