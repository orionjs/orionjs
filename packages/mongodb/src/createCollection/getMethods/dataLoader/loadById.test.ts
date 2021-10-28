import {generateId} from '@orion-js/helpers'
import createCollection from '../../index'

it('should data load by id', async () => {
  const Tests = createCollection({name: generateId()})

  const id1 = await Tests.insertOne({hello: 'world'})
  const id2 = await Tests.insertOne({hello: 'world'})

  const [loaded1, loaded2] = await Promise.all([Tests.loadById(id1), Tests.loadById(id2)])

  expect(loaded1._id).toBe(id1)
  expect(loaded2._id).toBe(id2)
})

it('should run only one query when same id', async () => {
  const Tests = createCollection({name: generateId()})

  const id1 = await Tests.insertOne({hello: 'world'})
  await Tests.insertOne({hello: 'world'})

  const [loaded1, loaded2] = await Promise.all([Tests.loadById(id1), Tests.loadById(id1)])

  expect(loaded1._id).toBe(id1)
  expect(loaded2._id).toBe(id1)
})
