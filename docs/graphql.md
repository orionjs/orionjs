---
id: graphql
title: GraphQL
sidebar_label: GraphQL
---

Orionjs is deeply integrated with GraphQL. It generates automatically the schemas and all boilerplate code. It supports subscriptions over websockets and uses Apollo Server. It only requires few lines of configuration to get started.

## Starting the GraphQL Server

Create a file that it's included on the startup of your app that calls the `startGraphQL` function.

```js
import {startGraphQL} from '@orion-js/graphql'
import resolvers from 'app/resolvers'

startGraphQL({
  resolvers,
  subscriptions,
  pubsub,
  graphiql
})
```

- `resolvers`: An object with all the resolvers of your app. If you pass the option `private: true` when creating the resolver, it will be omitted (see [`Resolvers`](https://orionjs.com/docs/resolvers)).
- `subscriptions`: An object containing all the subscriptions of your app.
- `pubsub`: Only required if you use subscriptions. A pubsub implementation compatible with [apollo-subscriptions](https://github.com/apollographql/graphql-subscriptions#pubsub-implementations).
- `graphiql`: A boolean to set up the graphiQL in-browser IDE for exploring GraphQL. Defaults to `true`.

By default, Orionjs provides this functionality in the `index` file of the `services/graphql` folder:

```
server
└── app
    └── services
        ├── graphql
        │   └── index.js
        └── index.js
```

In this file, Orionjs also provides a basic [CORS](https://orionjs.com/docs/http#cors) configuration for your app.

## Subscriptions

To define a subscription you must call the `subscription` function.

```js
import {subscription} from '@orion-js/graphql'

const mySubscription = subscription({
  params,
  returns
})
```

- `params`: The options of the subscription. A hash with a mix between the params and the subscription name will be the id of the channel.
- `returns`: A Model or a Type that is returned on every update.
- `checkPermission`: A function called every time the subscription is initialized. The string returned will be the permissions error code.

### Sending updates

To send an update you must call the subscription.

```js
await mySubscription(params, updatedItem)
```

## GraphiQL

When running the server app, you can check the [`GraphiQL`](https://github.com/graphql/graphiql) GraphQL IDE for testing queries and mutations by following the next URL:

```sh
http://localhost:3000/graphiql
```
