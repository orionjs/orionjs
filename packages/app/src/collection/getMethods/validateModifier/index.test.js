import validateModifier from './index'

it('should pass validation when not all fields are present', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }

  await validateModifier(schema, {$set: {'wife.state': 'Full'}})
})

it('should throw an error when a not present field is passed', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }

  expect.assertions(1)
  try {
    await validateModifier(schema, {$set: {'mom.name': 'Paula'}})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('validate arrays', async () => {
  const friend = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    friends: {type: [friend]}
  }

  await validateModifier(schema, {$set: {'friends.0.name': 'Roberto'}})
  await validateModifier(schema, {$set: {friends: [{name: 'Roberto'}]}})
  expect.assertions(1)
  try {
    await validateModifier(schema, {$set: {friends: ['Roberto']}})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('validate $push operations', async () => {
  const friend = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    friends: {type: [friend]}
  }

  await validateModifier(schema, {$push: {friends: {name: 'Roberto'}}})
  await validateModifier(schema, {
    $push: {friends: {$each: [{name: 'Roberto'}, {name: 'Joaquín'}]}}
  })
  expect.assertions(1)
  try {
    await validateModifier(schema, {$set: {friends: ['Roberto']}})
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('validate $unset operations', async () => {
  const schema = {
    _id: {type: 'ID'},
    name: {type: String, optional: true}
  }

  await validateModifier(schema, {$unset: {name: ''}})
})
