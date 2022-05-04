---
id: logger
title: Logger
sidebar_label: Logger
sidebar_position: 5
---

Orionjs realizes an implementation of the [Winston logger](https://github.com/winstonjs/winston). You can use this built-in logger to log the events and messages in your app.

## Install package

```bash npm2yarn
npm install @orion-js/logger
```

## Use Logger

### Sintax

```ts
logger.[level](message, metadata?)
```

- `level`: `debug`|`info`|`warn`|`error`
- `message`: A String that will contain the message to be displayed.
- `metadata?`: A Object that contains additional information.

### Example

```ts
import {logger} from '@orion-js/logger'

logger.debug('This is example')
logger.info('This is other example', {variable: 1})
logger.warn('warn')
logger.error('error')
```

### Returns

```bash
[info] [2022-03-30T14:29:21.426Z] [app/models/Counter/index.js:20:17] This is other example { variable: 1 }
[warn] [2022-03-30T14:29:21.428Z] [app/models/Counter/index.js:21:17] warn {}
[error] [2022-03-30T14:29:21.429Z] [app/models/Counter/index.js:22:17] error {}
```

## Log level

There are 4 levels of logs:

- `debug`
- `info`
- `warn`
- `error`

To set a log level, you must use the `setLogLevel` function:

### Example using setLogLevel

```ts
import {setLogLevel} from '@orion-js/logger'
setLogLevel('debug')
```

**Default** level is `warn`

## Custom Configure logger

Being a [Winston](https://github.com/winstonjs/winston) abstraction, you can customize logger it your way, [see more](https://github.com/winstonjs/winston).

### Example

```ts
import {configureLogger} from '@orion-js/logger'

configureLogger({
  level: 'info',
  defaultMeta: {service: 'user-service'}
  //...
})
```
