---
id: models
title: Models
sidebar_label: Models
---

## Create a model

The models in OrionJs define the structure of a collection which are its variables and types and at the same time it validates that the data entering or leaving the collection are correct, that they comply with the defined structure, but also the models have resolvers that can do direct queries to the database in Mongo to obtain custom data.

```
--- models
    --- model1
        --- schema
        --- index
        --- resolvers
            --- resolver1
    --- model2...
```

By convention the models are created in the app/models folder, but you can create a model anywhere. Here is an example for index.

```js
import {Model} from '@orion-js/app'

export default new Model({
  name: 'MyModel',
  schema: () => require('./schema'),
  resolvers: () => require('./resolvers')
})
```

- `name`: The name of the model.
- `Schema`: Describes the structure of each model. The complete documentation of the schemas is in [Orionjs Schemas](https://orionjs.com/docs/schema).
- `resolvers`: The resolvers of the models are controllers or specific functions to obtain data that are not directly in the database. You can use the current information in the database of a collection to create an custom output data. See more in [Orionjs Resolvers](https://orionjs.com/docs/resolvers).

---

## Schema

```js
export default {
  variable: {
    type: String,
    defaultValue: 'default value',
    optional: true
  }
}
```

- `variable`: Represents the key of one of the variables within a schema.
- `type` : Represents what type the data is in the schema.
- `defaultValue` : When an element is inserted in the database and one of its data is not mandatory, a default value can be assigned, in this case, the variable value would be 'default value'.
- `optional` : It is to return optional data specific to a schema that in a first stage are not necessary when creating an element.

This is a basic outline example of what the model schema would be when saving a credit card.

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

---

## Resolver

Taking the previous example of the credit card, this would be a resolver to obtain the name of the owner of the card.

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
- `params` : This resolver can be called as a function in other resolvers and receive parameters.
- `viewer` : Contains meta data from the user's session. For example `userId`

---

## Calling Model Resolver

To be able to call resolvers belonging to models we must first obtain data from the collection to which these resolvers belong. This is an example of how to call a resolver of a model from another resolver, assuming that the resolver belonging to the model of the credit card has the name `userName`.

```js
import {resolver} from '@orion-js/app'
import Cards from 'app/collections/Cards'
import Card from 'app/models/Card'
import getRandomParams from './getRandomParams'

export default resolver({
  params: {
    cardId: {
      type: 'ID'
    }
  },
  returns: Card,
  async resolve({cardId}, viewer) {
    const card = await findOne(cardId)

    const params = getRandomParams()
    const userName = await card.userName(params)

    console.log('user name', userName)

    return card
  }
})
```
