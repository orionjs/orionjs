import {
  configureEchoesRuntime,
  type EchoesErrorInfo,
  type EchoesRuntimeAdapter,
} from '@orion-js/echoes'
import {UserError} from '@orion-js/helpers'
import {registerRoute, route} from '@orion-js/http'
import {logger, runWithOrionAsyncContext} from '@orion-js/logger'
import {clean, cleanAndValidate, ValidationError} from '@orion-js/schema'
import {getInstance, Service} from '@orion-js/services'

const orionAdapter: EchoesRuntimeAdapter = {
  schema: {
    clean: (schema, value) => clean(schema as any, value as any),
    parse: (schema, value) => cleanAndValidate(schema as any, value as any),
  },
  logger,
  decorateService(target, context) {
    Service()(target, context)
  },
  getInstance,
  runWithContext(context, callback) {
    return runWithOrionAsyncContext(context, callback)
  },
  registerRequestHandler(definition) {
    registerRoute(
      route({
        method: definition.method,
        path: definition.path,
        bodyParser: 'json',
        bodyParserOptions: {
          limit: definition.bodyLimit,
        },
        async resolve(req) {
          return {
            body: await definition.handle(req.body),
          }
        },
      }),
    )
  },
  createValidationError(info: EchoesErrorInfo) {
    return new ValidationError(info.validationErrors || {}, info.labels || {})
  },
  createUserError(info: EchoesErrorInfo) {
    return new UserError(info.error, info.message, info.extra)
  },
}

let installed = false

export function installOrionEchoesAdapter(): void {
  if (installed) return
  configureEchoesRuntime(orionAdapter)
  installed = true
}

installOrionEchoesAdapter()
