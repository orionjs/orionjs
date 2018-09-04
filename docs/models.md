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

By convention the models are created in the app/models folder, but you can create a model anywhere. Here is an example for `model`.

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

#### Credit card schema example

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

All variables in the schema are static. Also, the schema validate the information that is insert into the data base are correct. For example, if in a resolver we get params to do an insert, and `last4` is missed, the schema automatically return error because the variable is not optional.

## Resolver

Model resolvers returns dynamic variables, you can create them for obtain custom data that aren't directly in the data base and not represent in the model schema.
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
