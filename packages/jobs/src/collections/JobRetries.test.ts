import JobRetries from './JobRetries'

it('should connect to the database correctly', async () => {
  await JobRetries.findOne()
})
