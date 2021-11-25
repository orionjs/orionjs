---
id: http
title: HTTP
sidebar_label: HTTP
sidebar_position: 3
---

Orionjs comes with a `http` module, powered by [micro](https://github.com/zeit/micro).

### Routes location

Orionjs provides an example for routes management in the `services/http` folder:

```
server
└── app
    └── services
        ├── http
        │   ├── home.js
        │   └── index.js
        └── index.js
```

## Defining a route

To define a new route you must call the `route` function from the app module.

```js
import {route} from '@orion-js/app'

route(path, func)
```

- `path`: A string that compilant with [path-to-regexp](https://github.com/pillarjs/path-to-regexp). To setup a route that responds when no other route is found, set `path` to `null`.
- `func`: The function that will be executed when the route is visited. It must be a function, the result of this function will be the response.

Function arguments:

- `params`: The parameters defined in the route path.
- `query`: The options passed in the url query.
- `pathname`: The final pathname.
- `request`: HTTP request object.
- `response`: HTTP response object.
- `headers`: An object with the passed headers.
- `getBody`: A function that returns a promise resolving the request body in text.
- `viewer`: An object with the information about the current viewer.

## CORS

You can define [`CORS`](https://developer.mozilla.org/es/docs/Web/HTTP/Access_control_CORS) options to all routes by calling this function:

```js
import {setCorsOptions} from '@orion-js/app'

setCorsOptions({
  origin: '*'
})
```

By default, Orionjs provides this functionality in the `index` file of the `services/graphql` folder:

```
server
└── app
    └── services
        ├── graphql
        │   └── index.js
        └── index.js
```

### Configuration

The configuration of `CORS` is done by setting the following variables:

- [`maxAge`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age) Default value: 86400
- [`origin`](https://developer.mozilla.org/es/docs/Web/HTTP/Headers/Access-Control-Allow-Origin) Default value: '\*'
- [`allowHeaders`](https://developer.mozilla.org/es/docs/Web/HTTP/Headers/Access-Control-Allow-Headers) Default value: ['X-Requested-With', 'Access-Control-Allow-Origin', 'X-HTTP-Method-Override', 'Content-Type', 'Authorization', 'Accept']
- [`exposeHeaders`](https://developer.mozilla.org/es/docs/Web/HTTP/Headers/Access-Control-Expose-Headers) Default value: []
- [`allowMethods`](https://developer.mozilla.org/es/docs/Web/HTTP/Headers/Access-Control-Allow-Methods) Default value: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

## Custom viewer

The authentication module handles the viewer object, but if you want to define a custom viewer getter, there's a function for that.

```js
import {setGetViewer} from '@orion-js/app'

setGetViewer(func)
```

- `func`: A async function. The object that this function returns will be the viewer in resolvers and http routes. This function will recieve the same arguments that the route handler recieves.
