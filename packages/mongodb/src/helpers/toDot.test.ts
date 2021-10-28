import toDot from './toDot'

it('should convert objects to dot notation', async () => {
  const result = toDot({
    person: {name: 'Nicolás'}
  })
  expect(result).toEqual({
    'person.name': 'Nicolás'
  })
})

it('should convert objects with array to dot notation', async () => {
  const result = toDot({
    person: {friends: [{person: {name: 'Joaquín'}}, {person: {name: 'Roberto'}}]}
  })
  expect(result).toEqual({
    'person.friends.0.person.name': 'Joaquín',
    'person.friends.1.person.name': 'Roberto'
  })
})
