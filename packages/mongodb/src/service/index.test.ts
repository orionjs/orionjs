import {getInstance, Inject, Service} from '@orion-js/services'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {OptionalId, WithoutId} from 'mongodb'
import {MongoCollection, Repository} from '.'
import {typedId, type Collection} from '../types'
import {describe, it, expect} from 'vitest'
import {createCollection} from '../createCollection'
import {InferSchemaType, schemaWithName} from '@orion-js/schema'
import {generateId} from '@orion-js/helpers'

describe('Collection as IOC', () => {
  it('should create the collection and set the methods', async () => {
    type UserId = `user_${string}`

    @TypedSchema()
    class User {
      @Prop({type: 'string'})
      _id: UserId

      @Prop({type: 'string'})
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

      getInstance(UserErrorRepo)
    } catch (error) {
      expect(error.message).toBe(
        'You must pass a class decorated with @Repository if you want to use @MongoCollection',
      )
    }
  })

  it('should work with the same example that is failing in migrations', () => {
    @Repository()
    class _MigrationsRepo {
      @MongoCollection({
        name: 'orionjs.migrations',
        idPrefix: 'scnmg-',
        indexes: [],
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

  it('should init the collection when injected to other initialized class', async () => {
    @Repository()
    class UserRepo {
      @MongoCollection({
        name: 'users2',
        idGeneration: 'random',
        idPrefix: 'user_',
      })
      users: Collection

      async createUser(user: any) {
        return await this.users.insertOne(user)
      }

      async getUserByName(name: string) {
        return await this.users.findOne({name})
      }
    }

    @Service()
    class UserService {
      @Inject(() => UserRepo)
      userRepo: UserRepo

      async checkForTests() {
        await this.userRepo.createUser({name: 'Nico'})
        return await this.userRepo.getUserByName('Nico')
      }
    }

    const instance = getInstance(UserService)
    const user = await instance.checkForTests()

    expect(user.name).toBe('Nico')
  })

  it('should work in v4 syntax', async () => {
    const UserSchema = schemaWithName('User', {
      _id: {
        type: typedId('user'),
      },
      name: {
        type: 'string',
      },
    })

    type UserType = InferSchemaType<typeof UserSchema>

    @Repository()
    class UserRepo {
      users = createCollection({
        name: generateId(),
        schema: UserSchema,
      })

      async createUser(user: OptionalId<UserType>) {
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

    const startsWith = userId.startsWith('user-')
    expect(startsWith).toBe(true)
  })
})
