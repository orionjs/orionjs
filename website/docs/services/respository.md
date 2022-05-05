---
id: repository
title: Repository
sidebar_label: Repository
sidebar_position: 3
---

Repository is a service that provides a repository for storing and retrieving data.
You can use any DB or data storage you like for a repository, but when a database is needed
we recomend using MongoDB with our ORM.

To define a repo you need to create a class that has the `@Repository` decorator.

```ts
import {Collection, MongoCollection, Repository} from '@orion-js/mongodb'
import {ExampleSchema} from 'app/exampleComponent/schemas/ExampleSchema'

@Repository()
export class ExampleRepository {
  @MongoCollection({
    name: 'examples',
    schema: ExampleSchema
  })
  private exampleCollection: Collection<ExampleSchema>

  async getExampleById(id: string): Promise<ExampleSchema> {
    return await this.exampleCollection.findOne({_id: id})
  }
}
```

You can use the `@MongoCollection` decorator to create a mongo collection.

The format is the following:

```ts
@MongoCollection(createCollectionOptions)
private exampleCollection: Collection<Schema>
```

- The parameters `createCollectionOptions` are defined here: [MongoCollection](/docs/modules/collections#create-a-collection).
- The property `exampleCollection` is the collection that will be created.
- Collection is the Typescript interface of a collection. You need this to allow Typescript to define all the methods.
- `<Schema>` is the `@TypedSchema` that is used for the document of this collection. This only validates at compilation, not at runtime. If you need to validate at runtime, you must all pass the `Schema` to the `model` parameter of the `@MongoCollection` decorator.

Refer to the [MongoDB Module](/docs/modules/collections) for more information.
