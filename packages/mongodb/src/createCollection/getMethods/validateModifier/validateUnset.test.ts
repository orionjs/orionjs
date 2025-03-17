import validateModifier from './index'
import {it, expect} from 'vitest'

it('validate $unset operations', async () => {
  const mom = {
    name: {type: String, optional: true},
  }
  const schema = {
    name: {type: String},
    age: {type: String, optional: true},
    mom: {type: mom},
  }

  await validateModifier(schema, {
    $unset: {
      age: '',
    },
  })

  await validateModifier(schema, {
    $unset: {
      'mom.name': '',
    },
  })

  expect.assertions(2)
  try {
    await validateModifier(schema, {
      $unset: {
        name: '',
        age: '',
      },
    })
  } catch (error) {
    expect(error.code).toBe('validationError')
  }

  try {
    await validateModifier(schema, {
      $unset: {
        mom: '',
      },
    })
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('should allow an $unset operation on a children of a required blackbox', async () => {
  const schema = {
    data: {
      type: 'blackbox',
    },
  }

  await validateModifier(schema, {
    $unset: {
      'data.items': '',
    },
  })

  expect.assertions(1)
  try {
    await validateModifier(schema, {
      $unset: {
        data: '',
      },
    })
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
