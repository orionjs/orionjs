import {Schema} from '.'
import {clean} from '..'

test('check ts types for schema', async () => {
  const schema: Schema = {
    numbers: {
      type: [Number]
    },
    string: {
      type: 'string',
      optional: true
    }
  }

  const result = await clean(schema, {numbers: ['2'], string: 1})
  expect(result).toEqual({numbers: [2], string: '1'})
})
