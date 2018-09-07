---
id: resolvers
title: Resolvers
sidebar_label: Resolvers
---

## Resolvers

The resolves in Orionjs are the controllers or main functions to execute routines, query the database and return data with defined structures. These are divided into two large types of resolvers, the resolvers of the application and the resolves of models. In the case of the resolvers of the application are generally defined to return data with the structures of the database and the resolvers of models return dynamic information, generally not defined in the schemas of the application.

### The structure of the main resolvers of the application

```
--- resolvers
    --- Resolver1
        --- resolver → index
        --- resolver1

```

Resolvers is the directory of the set of resolvers, Resolver1 represents the set of resolvers belonging to a specific collection, resolving to the index in charge of importing them all for its call and execution.

### Example of the resolvers directory index

```js
import {resolversSchemas} from '@orion-js/graphql'
import Resolver1 from './Resolver1'

export default {
  ...resolversSchemas,
  ...Resolver1
}
```

In the code `resolversSchemas` is responsible for validating both the existence and the correct structure of the imported resolvers, since they can be of type`mutation`, `simple resolver`,`crud resolver`, `paginated resolver`.

## Resolver types

### Simple resolver

The simple resolvers are controllers that can receive parameters and use these for a specific calculation or make a query to the database to return an element with its defined schema or of some specific type.

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

### Mutation resolver

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

### Paginated resolver

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

### Crud resolver

```js
import {crudResolvers} from '@orion-js/app'
import Examples from 'app/collections/Examples'

export default {
  ...crudResolvers({
    collection: Examples,
    paginatedOptions: {
      async getCursor({filter}, viewer) {
        return Examples.find()
      },
      params: {}
    }
  })
}
```

---

## Model resolver

getCity

```js
import {resolver} from '@orion-js/app'
import City from 'app/models/City'
import Cities from 'app/collections/Cities'

export default resolver({
  params: {},
  returns: City,
  mutation: false,
  resolve: async function(example, viewer) {
    return await Cities.findOne(example.cityId)
  }
})
```

```js
import Examples from 'app/collections/Examples'

export default async function(parameter1) {
  const example = await Examples.findOne(parameter1)
  return await example.getCity()
}
```
