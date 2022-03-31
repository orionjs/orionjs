---
id: http
title: HTTP
sidebar_label: HTTP
sidebar_position: 3
---

Orionjs comes with a `http` module, powered by [expressJS](https://expressjs.com).

# Install http package

```bash npm2yarn
npm install @orion-js/http
```

### Routes location

Orionjs provides an example for routes management in the `services/http` folder:

```
app
└── services
    ├── http
    │   └── index.ts
    └── index.ts
```

## Start server

```ts title="app/services/http/index.ts"
import {startServer, registerRoutes} from '@orion-js/http'

registerRoutes(routes)
startServer()
```

## Defining a route

To define a new route you must call the `route` function from package.

```ts
import {route} from '@orion-js/http'
```

The `route` function requires an argument of type Object that contains the following properties:

- `path`: string.
- `method`: 'get' | 'post' | 'put' | 'delete' | 'all'
- `bodyParser?`: 'json' | 'text' | 'urlencoded'
- `bodyParserOptions?`: Custom options to body parser.
- `middlewares?`: Add a middleware to the route, see https://expressjs.com/en/4x/api.html#middleware, for more information.
- `resolve(request, response, viewer)`: Async function that returns the [RouteResponse](#routeresponse).
  - `request`: HTTP request object.
  - `response`: HTTP response object.
  - `viewer`: An object with the information about the current viewer.
- `app?`: Pass another [express app](https://expressjs.com).

### RouteResponse

- `statusCode?`: Number, see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status for more information.
- `headers?`: {[key: string]: string}
- `body?`: string | object

### Example defining basic route

The following is a basic example using defining a route that will be exposed under the GET method on the route '/' and return a message in its body 'Hello World'

```ts title="app/http/hello/index.ts"
import {route} from '@orion-js/http'

export default route({
  path: '/',
  method: 'get',
  async resolve(req, res, viewer) {
    return {
      body: 'Hello world'
    }
  }
})
```
