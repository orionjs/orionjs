import {generateId} from '@orion-js/helpers'
import {createModel} from '@orion-js/models'
import {Schema} from '@orion-js/schema'
import {createCollection} from '..'
import {it, expect} from 'vitest'

it('updates a document without errors', async () => {
  const Tests = createCollection({name: generateId()})

  const docId = await Tests.insertOne({hello: 'world'})
  const result = await Tests.updateOne(docId, {$set: {hello: 'country'}})
  expect(result.modifiedCount).toBe(1)
  const final = await Tests.findOne(docId)
  expect(final.hello).toBe('country')
})

it('updates multiple document without errors', async () => {
  const Tests = createCollection({name: generateId()})

  await Tests.insertOne({hello: 'world'})
  await Tests.insertOne({hello: 'world'})
  const result = await Tests.updateMany({}, {$set: {hello: 'country'}})
  expect(result.modifiedCount).toBe(2)
  const items = await Tests.find({}).toArray()
  for (const item of items) {
    expect(item.hello).toBe('country')
  }
})

it('should update documents that have array passing validation', async () => {
  const friend = {
    name: {type: String},
  }
  const schema: Schema = {
    friends: {type: [friend]},
  }
  const model = createModel({name: generateId(), schema})

  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const personId = await Tests.insertOne({friends: [{name: 'Roberto'}, {name: 'Joaquín'}]})

  await Tests.updateOne(personId, {$set: {'friends.0.name': 'Robert'}})

  expect(await Tests.findOne(personId)).toEqual({
    _id: personId,
    friends: [{name: 'Robert'}, {name: 'Joaquín'}],
  })

  await Tests.updateOne(personId, {
    $push: {
      friends: {name: 'Bastian'},
    },
  })
  expect(await Tests.findOne(personId)).toEqual({
    _id: personId,
    friends: [{name: 'Robert'}, {name: 'Joaquín'}, {name: 'Bastian'}],
  })
})

it('should do $pull operation', async () => {
  const schema: Schema = {
    tags: {type: [String]},
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const itemId = await Tests.insertOne({tags: ['1', '2', '3', '4']})

  await Tests.updateOne(itemId, {$pull: {tags: '1'}})
  await Tests.updateOne(itemId, {$pull: {tags: {$in: ['3', '4']}}})

  expect(await Tests.findOne(itemId)).toEqual({
    _id: itemId,
    tags: ['2'],
  })
})

it('should update documents passing validation', async () => {
  const wife = {
    name: {type: String},
    state: {type: String},
  }
  const schema = {
    wife: {type: wife},
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const personId = await Tests.insertOne({'wife.state': 'Hungry', 'wife.name': 'Francisca'})

  await Tests.updateOne(personId, {$set: {'wife.state': 'Full'}})

  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, wife: {state: 'Full', name: 'Francisca'}})
})

it('should handle $inc operator on blackbox', async () => {
  const schema: Schema = {
    services: {
      type: 'blackbox',
    },
  }
  const model = createModel({
    name: generateId(),
    schema,
  })
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const userId = await Tests.insertOne({services: {phoneVerification: {tries: 1}}})

  await Tests.updateOne(userId, {$inc: {'services.phoneVerification.tries': 1}})

  const doc = await Tests.findOne(userId)

  expect(doc).toEqual({_id: userId, services: {phoneVerification: {tries: 2}}})
})

it('should update documents passing validation with blackbox field', async () => {
  const model = createModel({
    name: generateId(),
    schema: {
      services: {type: 'blackbox'},
    },
  })
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const personId = await Tests.insertOne({services: {password: 123456}})

  await Tests.updateOne(personId, {$set: {'services.forgot': 'mypassword'}})

  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, services: {password: 123456, forgot: 'mypassword'}})
})

it('should throw an error when modifier is invalid', async () => {
  const wife = {
    name: {type: String},
    state: {type: String},
  }
  const schema = {
    wife: {type: wife},
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const personId = await Tests.insertOne({'wife.state': 'Hungry', 'wife.name': 'Francisca'})

  expect.assertions(1)
  try {
    await Tests.updateOne(
      personId,
      {$set: {'wife.state': 'Full', 'mom.name': 'Paula'}},
      {clean: false},
    )
  } catch (error) {
    expect(error.code).toBe('validationError')
  }
})

it('dont add autovalue when updating', async () => {
  let index = 1
  const schema = {
    name: {
      type: String,
    },
    count: {
      type: Number,
      clean() {
        return index++
      },
    },
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const personId = await Tests.insertOne({name: 'Nicolás'})
  await Tests.updateOne(personId, {$set: {name: 'Nicolás López'}})
  const doc = await Tests.findOne(personId)
  expect(doc).toEqual({_id: personId, name: 'Nicolás López', count: 1})
})

it('should handle $ correctly', async () => {
  const Email = {
    address: {type: String},
    verified: {type: Boolean},
  }
  const schema: Schema = {
    emails: {type: [Email]},
  }
  const model = createModel({name: generateId(), schema})
  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const userId = await Tests.insertOne({
    emails: [
      {
        address: 'nicolas@orionsoft.io',
        verified: false,
      },
    ],
  })

  await Tests.updateOne(
    {_id: userId, 'emails.address': 'nicolas@orionsoft.io'},
    {
      $set: {'emails.$.verified': 'true'},
    },
  )

  expect(await Tests.findOne(userId)).toEqual({
    _id: userId,
    emails: [
      {
        address: 'nicolas@orionsoft.io',
        verified: true,
      },
    ],
  })
})

it('should pass full doc on clean as well as validate', async () => {
  const item = {_id: '1234', name: 'Nico'}
  const model = createModel({
    name: generateId(),
    schema: {
      name: {
        type: String,
        clean(value, {doc}) {
          expect(doc).toEqual({name: item.name})
          return value
        },
        validate(_value, {doc}) {
          expect(doc).toEqual({name: item.name})
        },
      },
    },
  })

  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  await Tests.updateOne({}, {$set: {name: 'Nico'}})
})

it('Should allow custom clean function on a blackbox field', async () => {
  const model = createModel({
    name: 'Item',
    schema: {
      info: {
        type: 'blackbox',
        optional: true,
        async clean() {
          return {hello: 'world'}
        },
      },
    },
  })

  const Tests = createCollection({
    name: generateId(),
    schema: model,
  })

  const itemId = await Tests.insertOne({info: {hello: 'world2'}})
  await Tests.updateOne(itemId, {$set: {info: {hello: 'world444'}}})

  const item = await Tests.findOne(itemId)
  expect(item).toEqual({_id: itemId, info: {hello: 'world'}})
})

it('Should be able to use custom clean for models on update', async () => {
  const modelFile = createModel({
    name: 'File',
    schema: {
      name: {type: String},
      lastName: {type: String, optional: true},
    },
    async clean(value) {
      if (!value) return null

      expect(typeof value.name).toBe('string')
      return {
        ...value,
        name: value.name.toUpperCase(),
        lastName: '1',
      }
    },
  })

  const model = createModel({
    name: 'Item',
    schema: {
      file: {type: modelFile},
    },
  })

  const Tests = createCollection({name: generateId(), schema: model})

  const docId = await Tests.insertOne({
    file: {name: '1'},
  })

  await Tests.updateOne(docId, {
    $set: {
      file: {name: 'Hello'},
    },
  })
  const result = await Tests.findOne(docId)

  expect(result.file.name).toBe('HELLO')
  expect(result.file.lastName).toBe('1')

  expect.assertions(4)
})
