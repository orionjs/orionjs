import Collection from '../index'
import generateId from './generateId'

it('updates a document without errors', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  const docId = await Tests.insert({hello: 'world'})
  const result = await Tests.findOneAndUpdate(
    docId,
    {$set: {hello: 'country'}},
    {returnOriginal: false}
  )
  expect(result.hello).toBe('country')
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})
