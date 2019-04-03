---
id: models
title: Models
sidebar_label: Models
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
            │   └── index.js
            └── index.js
```

By convention the models are created in the app/models folder, but you can create a model anywhere. Here is an example of the `index.js` file of a Model.

```js
import {Model} from '@orion-js/app'

export default new Model({
  name: 'Model1',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
```

- `name`: The name of the model.
- `schema`: Describes the structure of each model. The complete documentation of the schemas is in [Orionjs Schemas](https://orionjs.com/docs/schema).
- `resolvers`: The resolvers of the models are controllers or specific functions to obtain data that are not directly in the database. You can use the current information in the database of a collection to create an custom output data. See more in [Orionjs Resolvers](https://orionjs.com/docs/resolvers).

### Schema

The schema you pass to the model represents the static data, like the data saved in the database.

If you pass a model to a collection, when you insert or update an item it will be validated against the model schema.

**Example:**

```js
export default {
  _id: {
    type: 'ID'
  },
  userId: {
    type: 'ID'
  },
  last4: {
    type: String
    label: 'Last 4 digits'
  },
  isDefault: {
    type: Boolean,
    optional: true
  }
}
```

### Resolvers

Model resolvers represents dynamic variables. You can create them to obtain custom data that aren't directly present in the database or represented in the model schema.
Taking the previous example of the credit card, the next example would be a resolver to obtain user specific data. This new resolver should be saved in the `Card/resolvers` folder of the model and declared in the containing `index.js` file.

#### Obtain the owner name example.

```js
import {resolver} from '@orion-js/app'
import Users from 'app/collections/Users'

export default resolver({
  returns: String,
  async resolve(card, params, viewer) {
    const user = await Users.findOne({_id: card.userId})
    return user.name
  }
})
```

- `card` : Variable that contains the data of an especific credit card `(_id, userId, last4, isDefault)`.
- `params` : This resolver can be called as a function and receive parameters.
- `viewer` : Contains meta data from the user's session. For example, `userId`.

Resulting `Card/resolvers/index.js` file:

```js
import resolver1 from './resolver1'
import cardUser from './cardUser'

export default {
  resolver1,
  cardUser
}
```

When trying to get information from a Model resolver, refer to the resolver as if it were a Model function property:

```js
const card = await Cards.findOne(cardId)
return await card.cardUser()
```

## Clone a model

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
