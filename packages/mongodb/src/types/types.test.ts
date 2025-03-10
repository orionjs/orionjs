import {generateId} from '@orion-js/helpers'
import {modelResolver} from '@orion-js/resolvers'
import {Prop, ResolverProp, TypedSchema} from '@orion-js/typed-model'
import createCollection from '../createCollection/index'

it('uses correctly typescript for collections', async () => {
  const fullName = modelResolver({
    returns: String,
    async resolve(user: User) {
      return `${user.firstName} ${user.lastName}`
    },
  })

  type UserId = `userId-${string}`

  @TypedSchema()
  class User {
    @Prop({type: String})
    _id: UserId

    /**
     * The users first name
     */
    @Prop()
    firstName: string

    /**
     * The users last name
     */
    @Prop()
    lastName: string

    /**
     * The users full name
     */
    @ResolverProp(fullName)
    fullName: typeof fullName.modelResolve
  }

  const Users = createCollection<User>({name: generateId(), model: User, idPrefix: `userId-`})

  const userId = await Users.insertOne({
    firstName: 'Nico',
    lastName: 'López',
  })

  const user1 = await Users.findOne({_id: userId})

  expect(user1.firstName).toBe('Nico')
  expect(await user1.fullName()).toBe('Nico López')

  await Users.updateOne(userId, {$set: {firstName: 'Nicolás'}})

  const user2 = await Users.findOne({lastName: 'López'})

  expect(user2.firstName).toBe('Nicolás')

  await Users.deleteOne({_id: user2._id})
})
