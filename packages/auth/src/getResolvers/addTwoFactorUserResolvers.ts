import {Collection} from '@orion-js/mongodb'
import {modelResolver} from '@orion-js/resolvers'

export default function ({Users}: {Users: Collection}) {
  Users.model.getResolvers().hasTwoFactor = modelResolver({
    returns: Boolean,
    async resolve(user: any, params, viewer) {
      if (!user.services) return false
      if (!user.services.twoFactor) return false
      if (!user.services.twoFactor.enabled) return false
      return true
    }
  })
}
