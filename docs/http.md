---
id: http
title: HTTP
sidebar_label: HTTP
---

Orionjs comes with a http modules that's powered by [micro](https://github.com/zeit/micro).

## Defining a route

To define a new route you must call the `route` function from the app module.

```js
import {route} from '@orion-js/app'

route(path, func)
```

- `path`: A string that compilant with [path-to-regexp](https://github.com/pillarjs/path-to-regexp).
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

You can define cors options to all routes by calling this function:

```js
import {setCorsOptions} from '@orion-js/app'

setCorsOptions({
  origin: '*'
})
```

## Custom viewer

The authentication module handles the viewer object, but if you want to define a custom viewer getter, there's a function for that.

```js
import {setGetViewer} from '@orion-js/app'

setGetViewer(func)
```

- `func`: A async function. The object that this function returns will be the viewer in resolvers and http routes. This function will recieve the same arguments that the route handler recieves.
