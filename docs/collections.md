---
id: collections
title: Collections
sidebar_label: Collections
---

Orionjs is made to work with MongoDB de default. To connect to MongoDB and execute queries you must create `Collections`.

### The structure of the main collections of the application

```
server
└── app
    └── collections
        └── Collection1
            └── index.js
```

- `collections`: The directory of the set of collections.
- `Collection1`: Represents the collection use to manage its respective documents.

## Create a collection

By convention collections are created in the `app/collections` folder, but you can create a collection anywhere.

```js
import {Collection} from '@orion-js/app'

const MyCollection = new Collection({
  name,
  model,
  indexes,
  connection
})
```

- `name`: The name of the collection in MongoDB.
- `model`: A model assigned to the collection. The schema of the model will be used to validate inserts and updates into the collection, and it will be initialized when using find methods.
- `indexes`: An array of indexes for this collection. Each item will be passed to the `collection.createIndex(keys, options)` function from MongoDB.
  - `keys`: An object containing the keys.
  - `options` An object with the options of the index.
- `connection`: Specify another database connection ([see more](#connecting-to-multiple-databases)).

---

## Methods

The Orionjs collection API is an abstraction of the Nodejs MongoDB Driver. It has the following methods:

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

### Insert

Inserts documents to the DB. Each document will be cleaned and verified using the passed model's schema. This function will return the `_id` of the inserted item

```js
const docId = await collection.insertOne(document)
const docsIds = await collection.insertMany([document1, document2])
```

### Update

Updates documents in the DB. The changes will be verified using the passed model's schema. The fields that are not changed will not be verified.

```js
await updateOne(selector, modifier)
await updateMany(selector, modifier)
```

### Delete

Deletes one or many documents.

```js
await deleteOne(selector)
await deleteMany(selector)
```

### Aggregate

Returns a MongoDB cursor using the MongoDB aggregate function. This will not initialize items when returning.

```js
const result = await collection.aggregate(pipeline).toArray()
```

---

## Connecting to multiple databases

You can specify another database connection when initializing a collection. To connect to other database call the `connectToDatabase` function.

```js
import {connectToDatabase} from '@orion-js/app'

const mongoURL = process.env.OTHER_MONGO_URL

export default connectToDatabase(mongoURL)
```

Then use the object returned by that function on the connection param for the collection.

```js
import {Collection} from '@orion-js/app'
import User from 'app/models/User'
import otherDatabaseConnection from '../otherDatabaseConnection'

export default new Collection({
  name: 'users',
  model: User,
  connection: otherDatabaseConnection
})
```

---

## Using MongoDB node API

If you need to use the native MongoDB collection api you can get it from the `rawCollection` variable of the collection.

```

```
