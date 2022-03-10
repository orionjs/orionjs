---
id: models
title: Models
sidebar_label: Models
sidebar_position: 2
---

## Create a model

The models in Orionjs define the structure of a collection which are its variables and types. It validates that the data entering or leaving the collection is coherent with the defined structure in the schema, and allows queries and operations to the database in Mongo through the use of resolvers.

```
server
└── app
    └── models
        └── Model1
            ├── schema
            ├── resolvers
            │   ├── resolver1
            │   └── index.ts
            └── index.ts
```

By convention the models are created in the app/models folder, but you can create a model anywhere. Here is an example of the `index.ts` file of a Model.

```ts
import {Prop, TypedModel} from '@orion-js/typed-model'

@TypedModel()
export class Counter {
  /**
   * The name of the counter
   */
  @Prop()
  name: string

  /**
   * The current value of the counter
   */
  @Prop()
  counter: number
}
```
