import { getOptions } from '../optionsStore'
import speakeasy from 'speakeasy'
import { PermissionsError } from '@orion-js/app'

export default async function ({ userId, twoFactorCode } = {}) {
  const options = getOptions()
  if (!options.twoFactor) throw new Error('Two factor is disabled in this app')
  if (!userId) return

  const user = await options.Users.findOne(userId, { projection: { 'services.twoFactor': 1 } })
  const has = await user.hasTwoFactor()
  if (!has) return
  if (!twoFactorCode) {
    throw new PermissionsError('needsTwoFactorCode', {
      message: 'This operation needs two factor code'
    })
  }

  const verified = speakeasy.totp.verify({
    secret: user.services.twoFactor.base32,
    encoding: 'base32',
    token: twoFactorCode,
    window: 2
  })

  if (!verified) {
    throw new PermissionsError('invalidTwoFactorCode', {
      message: 'The two factor code is incorrect'
    })
  }
}
