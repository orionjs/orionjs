import {getInstance, Service} from '@orion-js/services'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {WithoutId} from 'mongodb'
import {MongoCollection, Repository} from '.'
import type {Collection} from '../types'
import {describe, it, expect} from 'bun:test'

describe('Collection as IOC', () => {
  it('should create the collection and set the methods', async () => {
    type UserId = `user_${string}`

    @TypedSchema()
    class User {
      @Prop({type: 'string'})
      _id: UserId

      @Prop()
      name: string
    }

    @Repository()
    class UserRepo {
      @MongoCollection<User>({
        name: 'users',
        schema: User,
        idGeneration: 'random',
        idPrefix: 'user_',
      })
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

  it('should throw an error when trying to set a collection param in a service that is not a repo', () => {
    expect.assertions(1)
    try {
      @Service()
      class UserErrorRepo {
        @MongoCollection({name: 'users2'})
        users: Collection
      }

      const instance = getInstance(UserErrorRepo)
    } catch (error) {
      expect(error.message).toBe(
        'You must pass a class decorated with @Repository if you want to use @MongoCollection',
      )
    }
  })


  it('should work with the same example that is failing in migrations',  () => {
    @Repository()
    class MigrationsRepo {
      @MongoCollection({
        name: 'orionjs.migrations',
        idPrefix: 'scnmg-',
        indexes: []
      })
      collection: Collection<any>

      async getCompletedMigrationNames() {
        const migrations = await this.collection.find().toArray()
        return migrations.map(m => m.name)
      }

      async saveCompletedMigration(name: string) {
        await this.collection.insertOne({name, completedAt: new Date()})
      }
    }

  })
})
