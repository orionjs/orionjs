import {Subscriptions, Subscription, getServiceSubscriptions} from './index'
import {getInstance} from '@orion-js/services'
import {describe, it, expect} from 'vitest'
import {schemaWithName} from '@orion-js/schema'
import createSubscription from '../subscription'

describe('Subscriptions classes', () => {
  it('should get the subscriptions using services v4 syntax', async () => {
    const ParamsSchema = schemaWithName('ParamsSchema', {
      name: {type: 'string'},
    })

    const UserSchema = schemaWithName('UserSchema', {
      _id: {type: 'string'},
      name: {type: 'string'},
    })

    @Subscriptions()
    class ExampleSubscriptionsService {
      @Subscription()
      onUserCreated = createSubscription({
        params: ParamsSchema,
        returns: UserSchema,
        async canSubscribe(params) {
          return params.name === 'test'
        },
      })
    }

    const subscriptions = getServiceSubscriptions(ExampleSubscriptionsService)

    expect(subscriptions.onUserCreated).toBeDefined()

    const instance = getInstance(ExampleSubscriptionsService)
    console.log(instance)
    expect(instance.onUserCreated.publish).toBeDefined()
    // expect(instance.onUserCreated.name).toBe('onUserCreated')

    // instance.onUserCreated.publish(
    //   {
    //     name: 'test',
    //   },
    //   {
    //     _id: '123',
    //     name: 'test',
    //   },
    // )
  })
})
