---
id: resolvers
title: Resolvers
sidebar_label: Resolvers
---

Resolvers in Orionjs are the controllers or main functions to execute routines, query the database and return data with defined structures. These are divided into two large types of resolvers, the resolvers of the application and the resolvers of models. In the case of the resolvers of the application are generally defined to return data with the structures of the database, and the resolvers of models return dynamic information, generally not defined in the schemas of the application.

### The structure of the main resolvers of the application

```
server
└── app
    └── resolvers
        ├── ResolverGroup
        │   ├── resolver1
        │   │   └── index.js
        │   └── index.js
        └── index.js
```

- `resolvers`: The directory of the set of resolvers.
- `Resolver1`: Represents the set of resolvers belonging to a specific collection, resolving to the index in charge of importing them all for its call and execution.

### Example of the resolvers directory index

```js
import {resolversSchemas} from '@orion-js/graphql'
import Resolver1 from './Resolver1'

export default {
  ...resolversSchemas,
  ...Resolver1
}
```

`resolversSchemas` is responsible for validating both the existence and the correct structure of the imported resolvers, since they can be of type [`Basic Resolver`](https://orionjs.com/docs/resolvers#basic-resolver), [`mutation`](https://orionjs.com/docs/resolvers#mutation), [`crudResolver`](https://orionjs.com/docs/resolvers#crud-resolver), and [`paginatedResolver`](https://orionjs.com/docs/resolvers#paginated-resolver).

## Resolver types

### Basic resolver

Basic resolvers are controllers that can receive parameters and use them for a specific calculation, or to make a GraphQL Query to the database to return an element with its defined schema or of some other specific type.

```js
import {resolver} from '@orion-js/app'
import Examples from 'app/collections/Examples'
import Example from 'app/models/Example'

export default resolver({
  params: {
    parameter1: {
      type: String
    }
  },
  returns: Example,
  mutation: false,
  async resolve({parameter1, parameter2}, viewer) {
    const response = await Examples.findOne(parameter1)
    return response
  }
})
```

### Paginated resolver

paginatedResolvers are used to get MongoDB cursors for a GraphQL Query, into a paginated list. Notice the `async getCursor()` function with respect to the `async resolve()` function in the [`basicResolver`](https://orionjs.com/docs/resolvers#basic-resolver).

```js
import {paginatedResolver} from '@orion-js/app'
import Example from 'app/models/Example'
import Examples from 'app/collections/Examples'

export default paginatedResolver({
  params: {},
  returns: Example,
  async getCursor(params, viewer) {
    const examples = Examples.find()
    return examples
  }
})
```

`paginatedResolvers` also can receive parameters like in `basicResolvers`:

```js
import {paginatedResolver} from '@orion-js/app'
import Example from 'app/models/Example'
import Examples from 'app/collections/Examples'

export default paginatedResolver({
  params: {
    parameter1: {
      type: String
    }
  },
  returns: Example,
  async getCursor({parameter1}, viewer) {
    const examples = Examples.find(parameter1)
    return examples
  }
})
```

### Mutation resolver

Mutations are used to perform GraphQL mutations to create, update or delete documents of a collection over the database. notice the `mutation: true` property, which is used to make the distintion for different modules to use, like [`Autoform`](https://orionjs.com/docs/autoform)

```js
import {resolver} from '@orion-js/app'
import Examples from 'app/collections/Examples'
import Example from 'app/models/Example'

export default resolver({
  params: {
    parameter1: {
      type: String
    },
    parameter2: {
      type: String
    }
  },
  returns: Boolean,
  mutation: true,
  async resolve({parameter1, parameter2}, viewer) {
    const example = await Examples.findOne(parameter1)
    await example.update({$set: {parameter2: parameter2}})
    return true
  }
})
```

### Crud resolver

`crudResolvers` have the peculiarity of be called from `CRUD`, a React Component created for the [Orionjs fullstack Boilerplate](https://github.com/orionjs/boilerplate-graphql-fullstack).

#### React App

```js
import React from 'react'
import Crud from 'App/components/Crud'

export default class Examples extends React.Component {
  static propTypes = {}

  getListFields() {
    return [{title: 'Field 1', name: 'field1'}, {title: 'Field 2', name: 'field2'}]
  }

  render() {
    return (
      <div className={styles.container}>
        <br />
        <Crud
          path="/examples"
          singular="Example"
          plural="Examples"
          allowSearch
          listFields={this.getListFields()}
        />
      </div>
    )
  }
}
```

#### Orionjs Resolver

```js
import {crudResolvers} from '@orion-js/app'
import Examples from 'app/collections/Examples'

export default {
  ...crudResolvers({
    collection: Examples,
    paginatedOptions: {
      async getCursor({field3}, viewer) {
        return Examples.find({field3})
      },
      params: {
        field3: {
          type: String,
          optional: true
        }
      }
    }
  })
}
```

---

## Model resolver

To learn about Model resolvers, refer to [`Model resolvers`](https://orionjs.com/docs/models#resolvers)
