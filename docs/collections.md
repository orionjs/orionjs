---
id: collections
title: Collections
sidebar_label: Collections
---

Orionjs is made to work with MongoDB de default. To connect to MongoDB and execute queries
you must create `Collections`.

## Create a collection

By convention collections are created in the `app/collections` folder, but you can create a collection anywhere.

```js
import {Collection} from '@orion-js/app'

const MyCollection = new Collection({
  name,
  model,
  indexes
})
```

- `name`: The name of the collection in MongoDB.
- `model`: A model that it's schema will be used to validate inserts and updates and it will be initialized when using findOne and find.
- `indexes`: An array of indexes for this collection. Each item will be passed to the `collection.createIndex(keys, options)` function from MongoDB.
  - `keys`: An object containing the keys.
  - `options` An object with the options of the index.

---

The Orionjs collection API is an abstraction of the Nodejs MongoDB Driver. It has the following methods:

## Find one

Returns a document initializing it with the passed model.

```js
const item = await collection.findOne(selector)
```

## Find

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

## Insert

Inserts documents to the DB. Each document will be cleaned and verified using the passed model's schema. This function will return the `_id` of the inserted item

```js
const docId = await collection.insertOne(document)
const docsIds = await collection.insertMany([document1, document2])
```

## Update

Updates documents in the DB. The changes will be verified using the passed model's schema. The fields that are not changed will not be verified.

```js
await updateOne(selector, modifier)
await updateMany(selector, modifier)
```

## Delete

Deletes one or many documents.

```js
await deleteOne(selector)
await deleteMany(selector)
```

## Aggregate

Returns a MongoDB cursor using the MongoDB aggregate function. This will not initialize items when returning.

```js
const result = await collection.aggregate(pipeline).toArray()
```

---

## Using MongoDB node API

If you need to use the native MongoDB collection api you can get it from the `rawCollection` variable of the collection.
