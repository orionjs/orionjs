import {generateId} from '@orion-js/helpers'
import {createCollection} from '..'
import {it, expect} from 'vitest'

it('updates a document without errors', async () => {
  const Tests = createCollection({name: generateId()})

  const docId = await Tests.insertOne({hello: 'world'})
  const result = await Tests.findOneAndUpdate(
    docId,
    {$set: {hello: 'country'}},
    {mongoOptions: {returnDocument: 'before'}},
  )
  expect(result.hello).toBe('world')
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})
