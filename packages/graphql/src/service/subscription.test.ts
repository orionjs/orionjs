import 'reflect-metadata'
import {Subscriptions, Subscription, getServiceSubscriptions} from './index'
import {OrionSubscription} from '../types'
import {getInstance} from '@orion-js/services'
import {TypedSchema, Prop} from '@orion-js/typed-model'

describe('Subscriptions classes', () => {
  it('should get the subscriptions using services', async () => {
    @TypedSchema()
    class Params {
      @Prop()
      name: string
    }

    @TypedSchema()
    class User {
      @Prop()
      name: string
    }

    @Subscriptions()
    class ExampleSubscriptionsService {
      @Subscription<Params, User>({
        params: Params,
        returns: User
      })
      onUserCreated: OrionSubscription<Params, User>
    }

    const subscriptions = getServiceSubscriptions(ExampleSubscriptionsService)

    expect(subscriptions.onUserCreated).toBeDefined()

    const instance = getInstance(ExampleSubscriptionsService)
    expect(instance.onUserCreated.publish).toBeDefined()
    expect(instance.onUserCreated.name).toBe('onUserCreated')

    // await instance.onUserCreated.publish({name: 'test'}, {name: 'test'})
  })
})
