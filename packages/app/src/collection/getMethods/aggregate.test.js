import Collection from '../index'
const {ReadPreference} = require('mongodb')
import generateId from '../../helpers/generateId'

it('ensuring the options are passed properly to the aggregate command', async () => {
  const Tests = await new Collection({name: generateId()}).await()

  const cursorDefault = await Tests.aggregate([
    {
      $match: {}
    }
  ])

  expect(cursorDefault.operation.readPreference.mode).toBe(ReadPreference.PRIMARY)
  expect(cursorDefault.options.readPreference.mode).toBe(ReadPreference.PRIMARY)

  const cursorSecondary = await Tests.aggregate(
    [
      {
        $match: {}
      }
    ],
    {
      readPreference: 'secondary'
    }
  )

  expect(cursorSecondary.operation.readPreference.mode).toBe(ReadPreference.SECONDARY)
  expect(cursorSecondary.options.readPreference.mode).toBe(ReadPreference.SECONDARY)
})
