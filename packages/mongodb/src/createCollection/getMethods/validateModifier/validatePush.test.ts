import validateOperator from './validateOperator'
import {it, expect} from 'vitest'

it('validate $push operations', async () => {
  const friend = {
    name: {type: String},
  }
  const person = {
    friends: {type: [friend]},
  }
  const schema = {
    person: {type: person},
  }

  const operation = '$push'

  await validateOperator({
    schema,
    operationDoc: {'person.friends': {name: 'Roberto'}},
    operation,
  })

  expect.assertions(1)
  try {
    await validateOperator({
      schema,
      operationDoc: {friends: 'Roberto'},
      operation,
    })
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('validate $push operations with deep array', async () => {
  const friend = {
    name: {type: String},
  }
  const person = {
    friends: {type: [friend]},
  }
  const schema = {
    persons: {type: [person]},
  }

  const operation = '$push'

  await validateOperator({
    schema,
    operationDoc: {'persons.1.friends': {name: 'Roberto'}},
    operation,
  })
})

it('validate $push with $each operations', async () => {
  const friend = {
    name: {type: String},
  }
  const schema = {
    friends: {type: [friend]},
  }

  const operation = '$push'

  await validateOperator({
    schema,
    operationDoc: {friends: {$each: [{name: 'Roberto'}, {name: 'Joaquín'}]}},
    operation,
  })

  expect.assertions(1)
  try {
    await validateOperator({
      schema,
      operationDoc: {friends: {$each: [{name: 'Joaquín'}, 'Roberto']}},
      operation,
    })
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('validate $addToSet', async () => {
  const friend = {
    name: {type: String},
  }
  const schema = {
    friends: {type: [friend]},
  }

  const operation = '$addToSet'

  await validateOperator({
    schema,
    operationDoc: {friends: {$each: [{name: 'Roberto'}, {name: 'Joaquín'}]}},
    operation,
  })
})
