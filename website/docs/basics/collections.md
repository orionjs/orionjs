---
id: collections
title: Collections
sidebar_label: Collections
sidebar_position: 4
---

Currently OrionJS only has support for connecting to and running queries against MongoDB.

## Configure Database

To continue, you need to have the database configured, [see more Database](../getting-started/database.md).

## Install package

```bash npm2yarn
npm install @orion-js/mongodb
```

### Proposed structure

```
app
└── collections
    └── Collection1
        └── index.ts
```

- `collections`: The directory of the set of collections.
- `Collection1`: Represents the collection use to manage its respective documents.

## Create a collection

By convention collections are created in the `app/collections` folder, but you can create a collection anywhere.

```ts title="app/collections/Counters/index.ts"
import {createCollection} from '@orion-js/mongodb'
import Counter from 'app/models/Counter'

export default createCollection<Counter>({
  name: 'counters',
  model: Counter,
  indexes: [
    {
      keys: {
        name: 1
      },
      options: {
        unique: true
      }
    }
  ]
})
```

- `name`: The name of the collection in MongoDB.
- `model?`: A model assigned to the collection. The schema of the model will be used to validate inserts and updates into the collection, and it will be initialized when using find methods.
- `indexes?`: An array of indexes for this collection. Each item will be passed to the `collection.createIndex(keys, options)` function from MongoDB.
  - `keys`: An object containing the keys.
  - `options` An object with the options of the index.
- `idGeneration?`: An string, use [Mongo ObjectID](https://www.mongodb.com/docs/manual/reference/method/ObjectId/) or one by Orion: `mongo`|`random`.
- `connectionName?`: Specify another database connection ([see more](#connecting-to-multiple-databases)).

---

## Methods

The Orionjs collection API is an abstraction of the [Nodejs MongoDB Driver](https://www.mongodb.com/docs/drivers/node/current/).

It has the following methods:

### Find one

Returns a document initializing it with the passed model.

```js
const item = await collection.findOne(selector)
```

### Find

Returns a MongoDB cursor.

```js
const cursor = collection.find(selector)
cursor.sort({date: -1})
```

The `toArray()` function of the cursor will initialize all the items with the passed model.

```js
const items = await collection.find(selector).toArray()
const count = await collection.find(selector).count()
```

### Insert One

Inserts documents to the DB. Each document will be cleaned and verified using the passed model's schema.

```js
const docId = await collection.insertOne(document)
```

**Returns:** A String containing `_id` of the inserted item.

### Insert Many

```js
const docsIds = await collection.insertMany([document1, document2])
```

**Returns:** A Array of Strings containing `_id` of the inserted items.

### Update One

Updates documents in the DB. The changes will be verified using the passed model's schema. The fields that are not changed will not be verified.

```js
await updateOne(selector, modifier)
```

### Update Many

```js
await updateMany(selector, modifier)
```

### Delete One

Delete one document.

```js
await deleteOne(selector)
```

### Delete Many

Deletes many documents.

```js
await deleteMany(selector)
```

### Aggregate

Returns a MongoDB cursor using the MongoDB aggregate function. This will not initialize items when returning.

```js
const result = await collection.aggregate(pipeline).toArray()
```

---

## Connecting to multiple databases

You can specify another database connection when initializing a collection. To connect to other database use `connectionName` property.

To establish the connection, need to define in your `.env` file the environment variable `MONGO_URL_ + connectionName` (in uppercase), as in the following example.

### Example

```bash title=".env"
...
MONGO_URL_OTHER=mongodb://localhost:3003/other-typescript-starter
...
```

```ts title="app/collections/Users/index.ts"
import {createCollection} from '@orion-js/mongodb'
import User from 'app/models/User'

export default createCollection<User>({
  name: 'users',
  model: User,
  connectionName: 'other',
  indexes: []
})
```

This will establish the connection between the name defined in `connectionName` and the environment variable defined `MONGO_URL_+connectionName.toUpperCase()`

---

## Using MongoDB node API

If you need to use the native MongoDB collection api you can get it from the `rawCollection` variable of the collection.
