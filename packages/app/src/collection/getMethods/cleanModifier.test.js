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
  const cleaned = await cleanModifier(schema, modifier)
  expect(cleaned).toEqual({})
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
