import Collection from '../index'
import generateId from '../../helpers/generateId'
import Model from '../../Model'

it('updates a document without errors', async () => {
  const Tests = await new Collection({name: generateId(), passUpdateAndRemove: false}).await()

  const docId = await Tests.insert({hello: 'world'})
  const result = await Tests.update(docId, {$set: {hello: 'country'}})
  expect(result.nModified).toBe(1)
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})

it('throws an error when no modifier is passed', async () => {
  const Tests = await new Collection({name: generateId(), passUpdateAndRemove: false}).await()

  expect.assertions(1)
  try {
    await Tests.update('anId')
  } catch (error) {
    expect(error.message).toBe('Modifier is required when making an update')
  }
})

it('updates multiple document without errors', async () => {
  const Tests = await new Collection({name: generateId(), passUpdateAndRemove: false}).await()

  await Tests.insert({hello: 'world'})
  await Tests.insert({hello: 'world'})
  const result = await Tests.update({}, {$set: {hello: 'country'}}, {multi: true})
  expect(result.nModified).toBe(2)
  const items = await Tests.find().toArray()
  for (const item of items) {
    expect(item.hello).toBe('country')
  }
})

it('should update documents that have array passing validation', async () => {
  const friend = {
    name: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    friends: {type: [friend]}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({friends: [{name: 'Roberto'}, {name: 'Joaquín'}]})

  await Tests.update(personId, {$set: {'friends.0.name': 'Robert'}})

  expect(await Tests.findOne(personId)).toEqual({
    _id: personId,
    friends: [{name: 'Robert'}, {name: 'Joaquín'}]
  })

  await Tests.update(personId, {$push: {friends: {name: 'Bastian'}}})
  expect(await Tests.findOne(personId)).toEqual({
    _id: personId,
    friends: [{name: 'Robert'}, {name: 'Joaquín'}, {name: 'Bastian'}]
  })
})

it('should do $pull operation', async () => {
  const schema = {
    _id: {type: 'ID'},
    tags: {type: [String]}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const itemId = await Tests.insert({tags: ['1', '2', '3', '4']})

  await Tests.update(itemId, {$pull: {tags: '1'}})
  await Tests.update(itemId, {$pull: {tags: {$in: ['3', '4']}}})

  expect(await Tests.findOne(itemId)).toEqual({
    _id: itemId,
    tags: ['2']
  })
})

it('should update documents passing validation', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({'wife.state': 'Hungry', 'wife.name': 'Francisca'})

  await Tests.update(personId, {$set: {'wife.state': 'Full'}})

  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, wife: {state: 'Full', name: 'Francisca'}})
})

it('should update documents passing validation with blackbox field', async () => {
  const schema = {
    _id: {type: 'ID'},
    services: {type: 'blackbox'}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({services: {password: 123456}})

  await Tests.update(personId, {$set: {'services.forgot': 'mypassword'}})

  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, services: {password: 123456, forgot: 'mypassword'}})
})

it('should throw an error when modifier is invalid', async () => {
  const wife = {
    name: {type: String},
    state: {type: String}
  }
  const schema = {
    _id: {type: 'ID'},
    wife: {type: wife}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({'wife.state': 'Hungry', 'wife.name': 'Francisca'})

  expect.assertions(1)
  try {
    await Tests.update(
      personId,
      {$set: {'wife.state': 'Full', 'mom.name': 'Paula'}},
      {clean: false}
    )
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('dont add autovalue when updating', async () => {
  let index = 1
  const schema = {
    _id: {type: 'ID'},
    name: {
      type: String
    },
    count: {
      type: Number,
      autoValue(name) {
        return index++
      }
    }
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({name: 'Nicolás'})
  await Tests.update(personId, {$set: {name: 'Nicolás López'}})
  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, name: 'Nicolás López', count: 1})
})

it('run custom model validation when inserting and updating', async () => {
  let called = 0
  let called2 = 0
  const deepModel = new Model({
    name: generateId(),
    schema: {
      password: {
        type: String
      },
      forgot: {
        type: String,
        optional: true
      }
    },
    async validate(value) {
      called++
    },
    async clean(value) {
      called2++
      return value
    }
  })
  const model = new Model({
    name: generateId(),
    schema: {
      _id: {type: 'ID'},
      services: {type: deepModel}
    }
  })
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const personId = await Tests.insert({services: {password: '123456'}})
  await Tests.update(personId, {$set: {'services.forgot': 'mypassword'}})

  expect(called).toBe(2)
  expect(called2).toBe(1)
})

it('should handle $ correctly', async () => {
  const Email = {
    address: {type: String},
    verified: {type: Boolean}
  }
  const schema = {
    _id: {type: 'ID'},
    emails: {type: [Email]}
  }
  const model = new Model({name: generateId(), schema})
  const Tests = await new Collection({
    name: generateId(),
    passUpdateAndRemove: false,
    model
  }).await()

  const userId = await Tests.insert({
    emails: [
      {
        address: 'nicolas@orionsoft.io',
        verified: false
      }
    ]
  })

  await Tests.update(
    {_id: userId, 'emails.address': 'nicolas@orionsoft.io'},
    {
      $set: {'emails.$.verified': 'true'}
    }
  )

  expect(await Tests.findOne(userId)).toEqual({
    _id: userId,
    emails: [
      {
        address: 'nicolas@orionsoft.io',
        verified: true
      }
    ]
  })
})
