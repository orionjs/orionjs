import fromDot from './fromDot'

it('should convert objects from dot notation', async () => {
  const result = fromDot({
    'person.name': 'Nicolás',
    'person.framework': 'Orion'
  })
  expect(result).toEqual({
    person: {name: 'Nicolás', framework: 'Orion'}
  })
})

it('should handle object with values that are not in dot notation', async () => {
  const doc = {
    'person.name': 'Nicolás',
    person: {friends: [{person: {name: 'Joaquín'}}, {person: {name: 'Roberto'}}]}
  }
  const result = fromDot(doc)
  expect(result).toEqual({
    person: {
      name: 'Nicolás',
      friends: [{person: {name: 'Joaquín'}}, {person: {name: 'Roberto'}}]
    }
  })
})

it('should convert objects with array from dot notation', async () => {
  const result = fromDot({
    'person.friends': [{'person.name': 'Joaquín'}, {'person.name': 'Roberto'}]
  })
  expect(result).toEqual({
    person: {friends: [{person: {name: 'Joaquín'}}, {person: {name: 'Roberto'}}]}
  })
})

it('should convert objects with index array from dot notation', async () => {
  const result = fromDot({
    'person.friends.0.person.name': 'Joaquín',
    'person.friends.1.person.name': 'Roberto'
  })
  expect(result).toEqual({
    person: {
      friends: [{person: {name: 'Joaquín'}}, {person: {name: 'Roberto'}}]
    }
  })
})
