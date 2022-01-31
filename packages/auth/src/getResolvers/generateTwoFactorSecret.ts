import {OrionError} from '@orion-js/helpers'
import {resolver} from '@orion-js/resolvers'
import speakeasy from 'speakeasy'
import qr from 'qr-image'
import {createModel} from '@orion-js/models'
import {Collection} from '@orion-js/mongodb'

const model = createModel({
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

export default ({Users, twoFactor = {}}: {Users: Collection; twoFactor?: any}) =>
  resolver({
    permissionsOptions: {
      requireUserId: true
    },
    returns: model,
    mutation: true,
    resolve: async function (params, viewer) {
      const user = await Users.findOne(viewer.userId)
      if (await user.hasTwoFactor()) {
        throw new Error('User has two factor')
      }

      const email = await user.email()
      const {base32} = speakeasy.generateSecret()
      await Users.updateOne(viewer.userId, {
        $set: {
          'services.twoFactor.base32': base32,
          'services.twoFactor.enabled': false
        }
      })

      const {issuer} = twoFactor

      if (!issuer) {
        throw new OrionError('Two factor issuer is required in configuration')
      }

      const encoded = encodeURIComponent(`${issuer}:${email}`)
      const urlIssuer = encodeURIComponent(issuer)
      const url = `otpauth://totp/${encoded}?secret=${base32}&issuer=${urlIssuer}`

      const qrCode = qr.imageSync(url, {type: 'svg'})

      return {
        base32,
        qrCode
      }
    }
  })
