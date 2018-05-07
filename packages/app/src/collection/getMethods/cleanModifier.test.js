import cleanModifier from './cleanModifier'

it('should remove the modifier if no fields are present in schema', async () => {
  const schema = {
    firstName: {
      type: String
    }
  }
  const modifier = {
    $set: {name: 'Nicolás'}
  }
  expect.assertions(1)
  try {
    await cleanModifier(schema, modifier)
  } catch (error) {
    expect(error.message).toBe('After cleaning your modifier is empty')
  }
})

it('should remove the invalid fields and leave the valid ones', async () => {
  const schema = {
    firstName: {
      type: String
    },
    lastName: {
      type: String
    }
  }
  const modifier = {
    $set: {name: 'Nicolás', lastName: 'López'}
  }
  const cleaned = await cleanModifier(schema, modifier)
  expect(cleaned).toEqual({$set: {lastName: 'López'}})
})

it('should clean modifier and leave dots', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const modifier = {$set: {'wife.state': 'Full'}}

  const cleaned = await cleanModifier(schema, modifier)
  expect(cleaned).toEqual(modifier)
})

it('should cleans $inc modifier', async () => {
  const schema = {
    age: {type: Number}
  }
  const modifier = {$inc: {age: '1'}}

  const cleaned = await cleanModifier(schema, modifier)
  expect(cleaned).toEqual({$inc: {age: 1}})
})

it('should clean modifier with arrays with index in key', async () => {
  const friend = {
    name: {type: String}
  }
  const schema = {
    friends: {type: [friend]}
  }
  const modifier = {$set: {'friends.0.name': 'Roberto', 'friends.1.name': 'Joaquín'}}
  const cleaned = await cleanModifier(schema, modifier)
  expect(cleaned).toEqual(modifier)
})

it('should clean modifier with arrays', async () => {
  const friend = {
    name: {type: String}
  }
  const schema = {
    friends: {type: [friend]}
  }

  const modifier = {$set: {friends: ['Joaquín', 'Roberto']}}
  const cleaned = await cleanModifier(schema, modifier)
  expect(cleaned).toEqual(modifier)
})

it('clean well deep schema fields', async () => {
  const tag = {
    name: {
      type: String
    }
  }
  const car = {
    brand: {
      type: String
    },
    tags: {
      type: [tag]
    }
  }
  const schema = {
    name: {
      type: String
    },
    car: {
      type: car
    }
  }
  const cleaned = await cleanModifier(schema, {
    $set: {name: 1234, 'car.brand': 'Nissan'}
  })
  expect(cleaned).toEqual({$set: {name: '1234', 'car.brand': 'Nissan'}})
})

it('should clean modifier with $push', async () => {
  const schema = {
    friends: {type: [String]}
  }
  const cleaned = await cleanModifier(schema, {
    $push: {friends: 1234}
  })
  expect(cleaned).toEqual({
    $push: {friends: '1234'}
  })
})

it('should clean modifier with $push and $each', async () => {
  const schema = {
    friends: {type: [String]}
  }
  const cleaned = await cleanModifier(schema, {
    $push: {friends: {$each: [1234, 'a string'], $slice: 3}}
  })
  expect(cleaned).toEqual({
    $push: {friends: {$each: ['1234', 'a string'], $slice: 3}}
  })
})

it('cleans $push modifier with deep array', async () => {
  const friend = {
    name: {type: String}
  }
  const person = {
    friends: {type: [friend]}
  }
  const schema = {
    persons: {type: [person]}
  }

  const cleaned = await cleanModifier(schema, {
    $push: {'persons.14321.friends': {name: 1234}}
  })
  expect(cleaned).toEqual({
    $push: {'persons.14321.friends': {name: '1234'}}
  })
})
