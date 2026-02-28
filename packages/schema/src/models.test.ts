import {getSchemaFromAnyOrionForm} from './models'

describe('GetSchemaFromAnyOrionForm', () => {
  it('should return the schema', () => {
    const schema = getSchemaFromAnyOrionForm({
      value: {
        type: Number,
      },
    })
    expect(schema).toEqual({
      value: {
        type: Number,
      },
    })
  })

  it('should return null if the type is not provided', () => {
    const schema = getSchemaFromAnyOrionForm(null)
    expect(schema).toBeNull()
  })

  it('should return the field type if the type is a field type', () => {
    const stringType = getSchemaFromAnyOrionForm('string')
    expect(stringType).toBe('string')
  })
})
