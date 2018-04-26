import getValidationErrors from './index'
import Errors from '../Errors'

const friend = {
  firstName: {
    type: String
  }
}

const car = {
  brand: {
    type: String
  },
  model: {
    type: String
  }
}

const schema = {
  firstName: {
    type: String
  },
  lastName: {
    type: String,
    optional: true
  },
  friends: {
    type: [friend]
  },
  car: {
    type: car,
    optional: true
  }
}

test('returns null when object is valid', async () => {
  const errors = await getValidationErrors(schema, {
    firstName: 'Nicolás',
    lastName: 'López',
    friends: [{firstName: 'Roberto'}, {firstName: 'Joaquin'}],
    car: {
      brand: 'Nissan',
      model: 'Kicks'
    }
  })
  expect(errors).toBeNull()
})

test('returns an array with the respective errors', async () => {
  const errors = await getValidationErrors(schema, {
    lastName: 'López',
    friends: [{lastName: 'Zibert'}, {firstName: 'Joaquin'}]
  })
  expect(errors).toEqual({
    firstName: Errors.REQUIRED,
    'friends.0.firstName': Errors.REQUIRED
  })
})

test('gives error when a document field is not present in schema', async () => {
  const errors = await getValidationErrors(
    {
      name: {
        type: String
      }
    },
    {
      name: 'Nicolás López',
      age: 25
    }
  )
  expect(errors).toEqual({
    age: 'Errors.NOT_IN_SCHEMA'
  })
})

test('gives an error if a optional object is present and has missing values', async () => {
  const errors = await getValidationErrors(schema, {
    firstName: 'Nicolás',
    lastName: 'López',
    friends: [{firstName: 'Joaquin'}],
    car: {
      brand: 'Nissan'
    }
  })
  expect(errors).toEqual({
    'car.model': Errors.REQUIRED
  })
})

test('can check errors in deeply nested keys', async () => {
  const children = {
    name: {
      type: String
    },
    car: {
      type: car,
      optional: true
    }
  }
  const mother = {
    name: {
      type: String
    },
    children: {
      type: [children]
    },
    car: {
      type: car
    }
  }
  const family = {
    name: {
      type: String
    },
    mother: {
      type: mother
    }
  }
  const deepSchema = {
    name: {
      type: String
    },
    family: {
      type: family
    }
  }
  const errors = await getValidationErrors(deepSchema, {
    name: 'Nicolás',
    family: {
      name: 'López',
      mother: {
        name: 'Paula',
        car: {
          model: 'Wrangler'
        },
        children: [
          {
            name: 'Paula',
            car: {
              brand: 'Citroën'
            }
          },
          {
            name: 'Diego',
            age: 21
          }
        ]
      }
    }
  })
  expect(errors).toEqual({
    'family.mother.car.brand': Errors.REQUIRED,
    'family.mother.children.0.car.model': Errors.REQUIRED,
    'family.mother.children.1.age': Errors.NOT_IN_SCHEMA
  })
})
