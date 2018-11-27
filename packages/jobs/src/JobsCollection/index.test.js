import JobsCollection from './index'

it('should connect to the database correctly', async () => {
  await JobsCollection.await()
})
