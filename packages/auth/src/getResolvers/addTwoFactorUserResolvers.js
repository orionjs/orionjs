import {resolver} from '@orion-js/app'

export default function({Users, twoFactor}) {
  Users.model.resolvers.hasTwoFactor = resolver({
    returns: Boolean,
    async resolve(user, params, viewer) {
      if (!user.services) return false
      if (!user.services.twoFactor) return false
      if (!user.services.twoFactor.enabled) return false
      return true
    }
  })
}
