---
id: http
title: HTTP
sidebar_label: HTTP
sidebar_position: 1
---

Orionjs comes with a `http` module, powered by [expressJS](https://expressjs.com).

## Install http package

```bash npm2yarn
npm install @orion-js/http
```

## Define Routes

To define a Routes controller, we use the decorator `@Routes()`:

```ts
import {Routes} from '@orion-js/http'

@Routes()
export class RoutesController {}
```

And to define routes, we use the decorator `@Route()`:

```ts
import {Request, Route, RouteResponse, Routes} from '@orion-js/http'

@Routes()
export class RoutesController {
  @Route({
    path: '/example/:exampleId',
    method: 'get'
  })
  async example(req: Request): RouteResponse {
    const {exampleId} = req.params
    return {
      body: await this.exampleService.getAExample(exampleId)
    }
  }
}
```

### Options

Options have the following properties:

- `path`: The path of the route.
- `method`: The HTTP method of the route.
- `middlewares`: An array of middlewares to be executed before the route.
- `bodyParser`: Which body parser to use. Options: `json`, `text` or `urlencoded`.
- `bodyParserOptions`: Options to pass to the body parser.

### Params

The function `example` is the route handler. It receives the request and returns a response.
The parameters of the function are:

- `req`: The request object.
- `res`: The response object.
- `viewer`: The viewer object parsed from the request.

### RouteResponse

The result of the function must have the following format:

- `body`: The body of the response. It can be a string or a object
- `statusCode`: The status code of the response.
- `headers`: The headers of the response.

If you will use `res.end()` you must return nothing.

## Start server

```ts title="app/config/http/index.ts"
import {startServer, registerRoutes} from '@orion-js/http'

registerRoutes(routes)
startServer()
```
