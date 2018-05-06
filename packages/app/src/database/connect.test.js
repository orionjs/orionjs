import connect from './connect'

it('should connect to the test mongodb database', async () => {
  const db = await connect()
  expect(db.s.databaseName).toBe('jest')
})
