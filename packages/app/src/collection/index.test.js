import Collection from './index'

it('should connect to the test mongodb database', async () => {
  const Views = new Collection({name: 'views'})
  await Views.await()
})

it('should let insert and find a document to the database', async () => {
  const Views = new Collection({name: 'test2', passUpdateAndRemove: false})
  await Views.await()

  const doc = {hello: 'world'}

  const docId = await Views.insert(doc)
  doc._id = docId

  const item = await Views.findOne(docId)
  expect(doc).toEqual(item)
})
