import { Schema } from '.'
import validate from './validate'

describe('Tests for global docuement validation',  () => {
  it('Should validate the root document after the leaves', async () => {
    const calls = []
    const schema: Schema = {
      name: {
        type: 'string',
        validate: () => {
          calls.push('leaf')
        }
      },
      __validate: () => {
        calls.push('root')
      }
    }

    await validate(schema, {name: 'Gabo'})


    expect(calls).toEqual(['leaf', 'root'])

  })
})