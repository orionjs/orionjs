---
id: models
title: Models
sidebar_label: Models
sidebar_position: 2
---

The models in Orionjs define the structure of a collection which are its variables and types. It validates that the data entering or leaving the collection is coherent with the defined structure in the schema.

When creating a model, you can use two ways: **with** or **without** decorators.

# Install Package

```bash npm2yarn
npm install @orion-js/models
```

## Proposed folder structure

By convention the models are created in the `app/models` folder, but you can create a model anywhere.

```
app
└── models
    └── MyModel
        ├── schema.ts
        ├── resolvers
        │   ├── resolver1
        │   │   └── index.ts
        │   └── index.ts
        └── index.ts
```

## Create a model

Here is an example of the `index.ts` file of a Model.

```ts title="app/models/MyModel/index.ts"
import {createModel} from '@orion-js/models'

export default createModel({
  name: 'MyModel',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
```

- `name`: The name of the model.
- `schema`: Describes the structure of each model. The complete documentation of the schemas is in [Orionjs Schemas](/docs/basics/schema).
- `resolvers`: The resolvers of the models are controllers or specific functions to obtain data that are not directly in the database. You can use the current information in the database of a collection to create an custom output data. See more in [Orionjs Resolvers](/docs/basics/resolvers).

## Create a Model with Decorators

Here is an example of the `index.ts` file of a Model using Decorators.

```ts title="app/models/MyModel/index.ts"
import {Prop, TypedModel, ResolverProp} from '@orion-js/typed-model'
import prettyText from './prettyText'

@TypedModel()
export class MyModel {
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

  /**
   * A texts returning the counter and the name
   */
  @ResolverProp(prettyText)
  prettyText: typeof prettyText.modelResolve
}
```

### Decorators

- `@TypedModel()`: Specifies that what follows will be a Model.
- `@Prop()`: Specifies that what follows will be a property of the Model.
- `@ResolverProp()`: .

## Clone a Model

Sometimes you need a copy of your model with some changes. For example when creating a update resolver, you want to create a new model that has all the model fields except `_id` or `createdAt`.

```js
Model.clone({
  name,
  omitFields,
  pickFields,
  mapFields,
  extendSchema,
  extendResolvers
})
```

- `name`: The new name of the model.
- `omitFields`: Optional. An array of the schema fields you want to omit in the new model.
- `pickFields`: Optional. An array of the schema fields you want to pass to the new model. You may use `omitFields` or `pickFields`, but not both at the same time.
- `mapFields`: Optional. A function that receives a field of the schema and returns a replacement for that field.
- `extendSchema`: Optional. Add fields to the cloned model.
- `extendResolvers`: Optional. Add resolvers to the cloned model.

#### Clone model example

```js
Model.clone({
  name: 'ModelClone',
  omitFields: ['_id, last4'],
  mapFields(field, key) {
    field.optional = true
    return field
  }
})
```

## Init item

Orionjs initializes items automatically when they come from the database, but if your data is not from a collection and you want to access resolvers, you need to initialize the item with the function `Model.initItem(data)`

## Validate and clean

The model exposes method to validate items directly against it's schema. `Model.validate(data)` and `Model.clean(data)`.

#### Examples

`Model.validate(data)` can be use to check the legitimacy of an object according to the schema

```js
import Model1 from 'app/models/Model1'

try {
  await Model1.validate(data)
} catch (error) {
  return 'missing Option'
}
```

On the other side, `Model1.clean(data)` removes all information from `data` inconsistent with the schema.
