import validateUpsert from './validateUpsert'

it('pass validation when everything is fine', async () => {
  const person = {
    name: {type: String},
    state: {type: String, optional: true}
  }
  const schema = {
    name: {type: String},
    age: {type: Number},
    wife: {type: person},
    friends: {type: [person]}
  }

  const selector = {name: 'Nicolás'}

  const modifier = {
    $inc: {age: 1},
    $set: {'wife.state': 'Hungry', 'wife.name': 'Francisca'},
    $push: {friends: {name: 'Joaquín'}}
  }

  await validateUpsert(schema, selector, modifier)
})

it('get correct validation errors', async () => {
  const person = {
    name: {type: String},
    state: {type: String, optional: true}
  }

  const schema = {
    name: {type: String},
    age: {type: Number},
    wife: {type: person},
    friends: {type: [person]}
  }

  const selector = {name: 'Nicolás'}

  const modifier = {
    $inc: {age: 'not a number'},
    $set: {'wife.state': 1, 'wife.name': 'Francisca'},
    $push: {friends: 'Joaquín'}
  }

  expect.assertions(1)
  try {
    await validateUpsert(schema, selector, modifier)
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})
