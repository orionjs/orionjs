import getValidationErrors from './index'

const friend = {
  firstName: {
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
  }
}

test.only('returns empty array when object is valid', async () => {
  const errors = await getValidationErrors(schema, {
    firstName: 'Nicolás',
    lastName: 'López',
    friends: [{firstName: 'Roberto'}, {firstName: 'Joaquin'}]
  })
  expect(errors).toEqual([])
})

test('returns an array with the respective errors', async () => {
  const errors = await getValidationErrors(schema, {
    lastName: 'López',
    friends: [{lastName: 'Zibert'}, {firstName: 'Joaquin'}]
  })
  expect(errors).toEqual([
    {key: 'firstName', code: 'required'},
    {key: 'friends.0.firstName', code: 'required'}
  ])
})
