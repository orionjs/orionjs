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
    'friends.0.firstName': Errors.REQUIRED,
    'friends.0.lastName': Errors.NOT_IN_SCHEMA
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
    age: Errors.NOT_IN_SCHEMA
  })
})

test('dont give error when array is optional and its not passed', async () => {
  const schema = {
    name: {
      type: String
    },
    tags: {
      type: [String],
      optional: true
    }
  }
  const errors = await getValidationErrors(schema, {
    name: 'Nicolás López',
    tags: []
  })
  expect(errors).toBeNull()
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

test('run custom validation when field is optional and no value is passed', async () => {
  const person = {
    name: {
      type: String,
      optional: true,
      custom(value) {
        return 'No'
      }
    },
    async __validate(value) {
      if (!value) return 'No object'
    }
  }
  const schema = {
    person: {
      type: person,
      optional: true
    },
    number: {
      type: Number,
      custom() {
        return 'No'
      }
    }
  }

  expect(
    await getValidationErrors(schema, {
      person: {name: null}
    })
  ).toEqual({
    number: Errors.REQUIRED,
    'person.name': 'No'
  })

  expect(
    await getValidationErrors(schema, {
      person: null,
      number: null
    })
  ).toEqual({
    number: Errors.REQUIRED,
    person: 'No object'
  })

  expect(
    await getValidationErrors(schema, {
      number: 123
    })
  ).toEqual({
    number: 'No',
    person: 'No object'
  })
})

test('can validate object type with custom validation', async () => {
  const person = {
    name: {
      type: String
    },
    async __validate(value) {
      return value.name === 'Nicolás' ? null : 'no'
    }
  }
  const schema = {
    person: {
      type: person
    }
  }

  expect(
    await getValidationErrors(schema, {
      person: {name: 'Nicolás'}
    })
  ).toBeNull()

  expect(
    await getValidationErrors(schema, {
      person: {name: 'Joaquin'}
    })
  ).toEqual({
    person: 'no'
  })
})

test('skip child validation if specified', async () => {
  const person = {
    firstName: {
      type: String
    },
    lastName: {
      type: String
    },
    async __skipChildValidation(value) {
      return value.firstName === 'Nicolás'
    }
  }

  const schema = {
    persons: {
      type: [person]
    }
  }

  expect(
    await getValidationErrors(schema, {
      persons: [{firstName: 'Nicolás'}]
    })
  ).toBeNull()

  const errors = await getValidationErrors(schema, {
    persons: [{firstName: 'Joaquin'}]
  })
  expect(errors).toEqual({
    'persons.0.lastName': Errors.REQUIRED
  })
})

test('pass currentDoc validating arrays', async () => {
  const aItem = {name: 'Nicolás'}
  const doc = {items: [aItem]}

  const item = {
    name: {
      type: String,
      async custom(name, {currentDoc}) {
        expect(currentDoc).toBe(aItem)
      }
    }
  }

  const schema = {
    items: {
      type: [item],
      async custom(items, {currentDoc}) {
        expect(currentDoc).toBe(doc)
      }
    }
  }

  expect.assertions(2)
  await getValidationErrors(schema, doc)
})

test('pass currentDoc validating complex schemas', async () => {
  const aCar = {brand: 'Jeep'}
  const aMom = {name: 'Paula', car: aCar}
  const aItem = {name: 'Nicolás', mom: aMom}
  const doc = {items: [aItem]}

  const car = {
    brand: {
      type: String,
      async custom(value, {currentDoc}) {
        expect(value).toEqual(aCar.brand)
        expect(currentDoc).toEqual(aCar)
      }
    },
    async __validate(value, info) {
      expect(value).toEqual(aMom.car)
      expect(info.currentDoc).toEqual(aMom)
    }
  }

  const mom = {
    name: {
      type: String,
      async custom(value, {currentDoc}) {
        expect(value).toEqual(aMom.name)
        expect(currentDoc).toEqual(aMom)
      }
    },
    car: {
      type: car,
      async custom(value, {currentDoc, doc}) {
        expect(value).toEqual(aMom.car)
        expect(currentDoc).toEqual(aMom)
      }
    }
  }

  const item = {
    name: {
      type: String,
      async custom(value, {currentDoc}) {
        expect(value).toEqual(aItem.name)
        expect(currentDoc).toEqual(aItem)
      }
    },
    mom: {
      type: mom,
      async custom(value, {currentDoc}) {
        expect(value).toEqual(aItem.mom)
        expect(currentDoc).toEqual(aItem)
      }
    }
  }

  const schema = {
    items: {
      type: [item],
      async custom(value, {currentDoc}) {
        expect(value).toEqual(doc.items)
        expect(currentDoc).toEqual(doc)
      }
    }
  }

  expect.assertions(14)
  await getValidationErrors(schema, doc)
})
