import JobUniquenessKeys from './JobUniquenessKeys'

it('should connect to the database correctly', async () => {
  await JobUniquenessKeys.findOne()
})
