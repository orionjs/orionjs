import {generateId} from '@orion-js/helpers'
import {createCollection} from '..'
import {it, expect} from 'vitest'

it('ensuring the options are passed properly to the aggregate command', async () => {
  const Tests = createCollection({name: generateId()})

  await Tests.startConnection()

  const cursorDefault = Tests.aggregate([{$match: {}}])

  expect(cursorDefault.readPreference?.mode).toBe('primary')

  const cursorSecondary = Tests.aggregate(
    [
      {
        $match: {},
      },
    ],
    {
      readPreference: 'secondary',
    },
  )

  expect(cursorSecondary.readPreference?.mode).toBe('secondary')
})
