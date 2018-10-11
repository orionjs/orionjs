---
id: authentication
title: Authentication
sidebar_label: Authentication
---

## Two factor authentication

Orionjs comes with the ability to add two factor authentication to your app.

To activate two factor authentication you must pass the options when initializing the Authentication resolvers.

```js
import {getAuthResolvers} from '@orion-js/auth'

export default getAuthResolvers({
  ...
  twoFactor: {
    issuer: 'Orionjs' // The name of the issuer for the QR code generation
  }
})
```

By doing this, the two factor code will be required when signing in, and the resolvers to activate and deactivate the code will be created.

### Requesting two factor code

You can request the two factor code anywhen in your app. In a resolver you have to way to request the code.

```js
import {resolver} from '@orion-js/app'
import {requireTwoFactor} from '@orion-js/auth' // only for option 2

resolver({
  params: {},
  returns: String,
  mutation: true,
  // Option 1: adding the parameter in the resolver
  requireTwoFactor: true,
  async resolve(params, viewer) {
    // Option 2: call the requireTwoFactor function
    await requireTwoFactor(viewer) // you must pass the viewer as to this function
    ...
  }
})
```

### Client side two factor

Orionjs clientside will automatically detect when a two factor code is needed. By default a plain JavaScript prompt will be called.

To override the default prompt you can pass a async function to the `createClient` function of `graphql-client`.

```js
createClient({
  ...
  promptTwoFactorCode: async () => {/* do something to request the code */},
})
```

For more information about how to use it, check the graphql-fullstack starter kit:

- [Custom prompt](https://github.com/orionjs/boilerplate-graphql-fullstack/blob/master/web/src/App/Root/apollo.js)
- [Two factor setup](https://github.com/orionjs/boilerplate-graphql-fullstack/blob/master/web/src/App/Pages/App/Settings/Security/TwoFactor/index.js)
