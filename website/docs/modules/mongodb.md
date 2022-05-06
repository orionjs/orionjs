---
id: mongodb
title: MongoDB
sidebar_label: MongoDB
sidebar_position: 4
---

import Tabs from '@theme/Tabs'
import TabItem from '@theme/TabItem'

## Install package

```bash npm2yarn
npm install @orion-js/mongodb
```

## Create a collection

<Tabs>
  <TabItem value="standard" label="Standard">

```ts
import {createCollection} from '@orion-js/mongodb'
import Counter from '../schemas/Counter'

const Counters = createCollection<Counter>({
  name: 'counters',
  schema: Counter,
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

  </TabItem>

  <TabItem value="services" label="Services">

```ts
import {Collection, MongoCollection, Repository} from '@orion-js/mongodb'
import Counter from '../schemas/Counter'

@Repository()
export class CountersRepository {
  @MongoCollection({
    name: 'counters',
    schema: Counter,
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
  private counters: Collection<Counter>
}
```

  </TabItem>
</Tabs>

- `name`: The name of the collection in MongoDB.
- `schema?`: The schema assigned to the collection. The schema of the collection will be used to validate inserts and updates into the collection.
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

Returns a document.

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

### Count documents

Counts the documents in the collection using a selector.

```js
await countDocuments(selector)
```

---

## Connecting to multiple databases

You can specify another database connection when initializing a collection. To connect to other database use `connectionName` property.

To establish the connection, need to define in your `env` with the `mongo_url + connectionName`, as in the following example.

### Example

```yml title=".env.local.yml"
version: '1.0'
publicKey: nOQ9F5UxfKBM8RIYtC/NFJldBiEMfnb9nOXyVUrb/mY=
cleanKeys:
  http_port: 8080
  mongo_url_other: mongodb://localhost:3003/orionjs-example
encryptedKeys: {}
```

```ts
import {createCollection} from '@orion-js/mongodb'

export default createCollection({
  name: 'users',
  connectionName: 'other'
})
```

This will establish the connection between the name defined in `connectionName` and the environment variable defined `mongo_url + connectionName`

---

## Using MongoDB node API

If you need to use the native MongoDB collection api you can get it from the `rawCollection` variable of the collection.
