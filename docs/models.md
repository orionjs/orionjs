---
id: models
title: Models
sidebar_label: Models
---

## Create a model

The models in Orionjs define the structure of a collection which are its variables and types and at the same time it validates that the data entering or leaving the collection are correct, that they comply with the defined structure, but also the models have resolvers that can do direct queries to the database in Mongo to obtain custom data.

```
--- models
    --- Model1
        --- schema
        --- model
        --- resolvers
            --- resolver1
```

By convention the models are created in the app/models folder, but you can create a model anywhere. Here is an example for a Model.

```js
import {Model} from '@orion-js/app'

export default new Model({
  name: 'MyModel',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
```

- `name`: The name of the model.
- `schema`: Describes the structure of each model. The complete documentation of the schemas is in [Orionjs Schemas](https://orionjs.com/docs/schema).
- `resolvers`: The resolvers of the models are controllers or specific functions to obtain data that are not directly in the database. You can use the current information in the database of a collection to create an custom output data. See more in [Orionjs Resolvers](https://orionjs.com/docs/resolvers).

### Schema

The schema you pass to the model represents the static data. For exmaple, the data saved in the database.

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

Model resolvers represents dynamic variables, you can create them to obtain custom data that aren't directly in the database and not represented in the model schema.
Taking the previous example of the credit card, this would be a resolver to obtain user specific data.

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

- `card` : It contains the data of an especific credit card `(_id, userId, last4, isDefault)`.
- `params` : This resolver can be called as a function and receive parameters.
- `viewer` : Contains meta data from the user's session. For example `userId`.

## Clone a model

Sometimes you need a copy of your model with some changes. For example when creating a update resolver, you want to create a new model that has all fields except `_id` or `createdAt`.

```js
Model.clone({
  name,
  omitFields,
  pickFields,
  mapFields
})
```

- `name`: The new name of the model.
- `omitFields`: An array of the schema fields you want to omit in the new model.
- `pickFields`: An array of the schema fields you want to pass to the new model. You must use `omitFields` or `pickFields` but not both.
- `mapFields`: Optional, a function that receives a field of the schema and returns a replacement for that field. This can be used to update the `optional` option for example

## Init item

Orionjs initializes items automatically when they come from the database, but if your data is not from a collection and you want to access resolvers, you need to initialize the item with the function `Model.initItem(data)`

## Validate and clean

The model exposes method to validate items directly against it's schema. `Model.validate(data)` and `Model.clean(data)`.
