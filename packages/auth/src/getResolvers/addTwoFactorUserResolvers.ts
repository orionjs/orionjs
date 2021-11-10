import {modelResolver} from '@orion-js/resolvers'

export default function ({Users, twoFactor}) {
  Users.model.resolvers.hasTwoFactor = modelResolver({
    returns: Boolean,
    async resolve(user: any, params, viewer) {
      if (!user.services) return false
      if (!user.services.twoFactor) return false
      if (!user.services.twoFactor.enabled) return false
      return true
    }
  })
}
