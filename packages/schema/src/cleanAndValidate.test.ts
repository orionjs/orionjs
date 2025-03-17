import {describe, it, expect} from 'vitest'
import {cleanAndValidate, ValidationError} from '.'

describe('cleanAndValidate', () => {
  it('should clean and validate a schema', async () => {
    const schema = {
      name: {type: 'string'},
    }

    const result = await cleanAndValidate(schema, {name: 'John'})
    expect(result).toEqual({name: 'John'})
  })

  it('should throw an error if the schema is invalid', async () => {
    const schema = {
      age: {type: 'number'},
    }

    expect.assertions(2)

    try {
      await cleanAndValidate(schema, {age: 'dsfadf' as any})
    } catch (error) {
      const validationError = error as ValidationError
      expect(validationError).toBeInstanceOf(ValidationError)
      expect(validationError.validationErrors).toEqual({
        age: 'notANumber',
      })
    }
  })

  it('should be able to validate just field types', async () => {
    const result = await cleanAndValidate('boolean', true)
    expect(result).toBe(true)
  })
})
