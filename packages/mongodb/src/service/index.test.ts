import {getInstance} from '@orion-js/services'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {WithoutId} from 'mongodb'
import {MongoCollection, Repository} from '.'
import {Collection} from '../types'

describe('Collection as IOC', () => {
  it('should create the collection and set the methods', async () => {
    @TypedSchema()
    class User {
      @Prop()
      _id: string

      @Prop()
      name: string
    }

    @Repository()
    class UserRepo {
      @MongoCollection({name: 'users'})
      users: Collection<User>

      async createUser(user: WithoutId<User>) {
        return await this.users.insertOne(user)
      }

      async getUserByName(name: string) {
        return await this.users.findOne({name})
      }
    }

    const instance = getInstance(UserRepo)

    const userId = await instance.createUser({name: 'Nico'})
    const user = await instance.getUserByName('Nico')

    expect(user._id).toBe(userId)
  })
})
