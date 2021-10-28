import {generateId} from '@orion-js/helpers'
import {property} from 'lodash'
import createCollection from './index'

it('uses correctly typescript for collections', async () => {
  class User {
    /**
     * The users name
     */
    name: string

    lastName: string
  }

  const Users = createCollection<User>({name: generateId()})

  const userId = await Users.insertOne({
    name: 'Nico',
    lastName: 'López'
  })

  const user1 = await Users.findOne(userId)

  expect(user1.name).toBe('Nico')

  Users.updateOne(userId, {$set: {name: 'Nicolás'}})

  const user2 = await Users.findOne({lastName: 'Nicolás'})

  expect(user2._id).toBe('Nicolás')

  Users.deleteOne({_id: user2._id})
})
