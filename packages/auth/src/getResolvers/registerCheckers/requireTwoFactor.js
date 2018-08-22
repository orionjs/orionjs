import requireTwoFactorFunc from '../../helpers/requireTwoFactor'

export default ({Users}) =>
  async function({requireTwoFactor}, viewer) {
    if (!requireTwoFactor) return
    await requireTwoFactorFunc(viewer)
  }
