import { Schema } from '.'
import validate from './validate'

describe('Tests for global document validation',  () => {
  it('Should validate child values before current value', async () => {
    const calls = []
    const schema: Schema = {
      name: {
        type: 'string',
        validate: () => {
          calls.push('child')
        }
      },
      __validate: () => {
        calls.push('current')
      }
    }
    await validate(schema, {name: 'Gabo'})
    expect(calls).toEqual(['child', 'current'])
  })
})