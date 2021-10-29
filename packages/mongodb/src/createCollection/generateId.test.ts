import {generateId} from '@orion-js/helpers'
import createCollection from './index'
import {ObjectID} from 'bson'

it('generates a usable mongo objectId as string', async () => {
  const Tests = createCollection({name: generateId()})

  const now = new Date()

  const userId = await Tests.insertOne({
    name: 'Nico'
  })

  const objectId = new ObjectID(userId)

  expect(objectId.toString()).toBe(userId)

  const diff = now.valueOf() - objectId.getTimestamp().valueOf()

  expect(diff).toBeGreaterThan(0)
})
