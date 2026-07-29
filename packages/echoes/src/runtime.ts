import {AsyncLocalStorage} from 'node:async_hooks'
import {randomUUID} from 'node:crypto'
import {type EchoesErrorInfo, EchoesUserError, EchoesValidationError} from './errors'

export interface EchoesLogger {
  debug(message: string, metadata?: unknown): void
  info(message: string, metadata?: unknown): void
  warn(message: string, metadata?: unknown): void
  error(message: string, metadata?: unknown): void
}

export interface EchoesSchemaAdapter {
  clean<T = unknown>(schema: unknown, value: unknown): T | Promise<T>
  parse<T = unknown>(schema: unknown, value: unknown): T | Promise<T>
}

export interface EchoesExecutionContext {
  contextId?: string
  controllerType: 'echo'
  echoName: string
  params?: unknown
}

export interface EchoesRequestHandlerDefinition {
  method: 'post'
  path: string
  bodyLimit: string
  handle(body: unknown): Promise<unknown>
}

export type EchoesRequestHandlerRegistrar = (
  definition: EchoesRequestHandlerDefinition,
) => void | Promise<void>

export interface EchoesRuntimeAdapter {
  schema?: EchoesSchemaAdapter
  logger?: EchoesLogger
  registerRequestHandler?: EchoesRequestHandlerRegistrar
  decorateService?(target: Function, context: ClassDecoratorContext): void
  getInstance?<T extends object>(target: new (...args: any[]) => T): T
  runWithContext?<T>(context: EchoesExecutionContext, callback: () => T | Promise<T>): Promise<T>
  createValidationError?(info: EchoesErrorInfo): Error
  createUserError?(info: EchoesErrorInfo): Error
}

const defaultLogger: EchoesLogger = {
  debug: (message, metadata) =>
    metadata === undefined ? console.debug(message) : console.debug(message, metadata),
  info: (message, metadata) =>
    metadata === undefined ? console.info(message) : console.info(message, metadata),
  warn: (message, metadata) =>
    metadata === undefined ? console.warn(message) : console.warn(message, metadata),
  error: (message, metadata) =>
    metadata === undefined ? console.error(message) : console.error(message, metadata),
}

let runtime: EchoesRuntimeAdapter = {}
const contextStorage = new AsyncLocalStorage<EchoesExecutionContext & {contextId: string}>()

/**
 * Installs framework integrations without coupling Echoes to a framework.
 * The returned function restores the previous adapter, which is useful in tests.
 */
export function configureEchoesRuntime(adapter: EchoesRuntimeAdapter): () => void {
  const previous = runtime
  runtime = {...runtime, ...adapter}
  return () => {
    runtime = previous
  }
}

export function getEchoesRuntime(): EchoesRuntimeAdapter {
  return runtime
}

export function getEchoesLogger(): EchoesLogger {
  return runtime.logger || defaultLogger
}

export function getEchoesContext(): (EchoesExecutionContext & {contextId: string}) | undefined {
  return contextStorage.getStore()
}

export async function runWithEchoesContext<T>(
  context: EchoesExecutionContext,
  callback: () => T | Promise<T>,
): Promise<T> {
  const contextWithId = {contextId: context.contextId || randomUUID(), ...context}
  return await contextStorage.run(contextWithId, async () => {
    if (runtime.runWithContext) {
      return await runtime.runWithContext(contextWithId, callback)
    }
    return await callback()
  })
}

function isSimpleSchemaLike(schema: unknown): schema is {
  clean(value: unknown, options?: Record<string, unknown>): unknown
  validate(value: unknown): unknown
} {
  return (
    !!schema &&
    typeof schema === 'object' &&
    typeof (schema as any).clean === 'function' &&
    typeof (schema as any).validate === 'function'
  )
}

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (Buffer.isBuffer(value)) return Buffer.from(value) as T
  if (Array.isArray(value)) return value.map(cloneValue) as T
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return value

  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    result[key] = cloneValue(child)
  }
  return result as T
}

async function cleanSimpleSchema<T>(
  schema: {
    clean(value: unknown, options?: Record<string, unknown>): unknown
    validate(value: unknown): unknown
  },
  value: unknown,
): Promise<T> {
  const cloned = cloneValue(value)
  return (await schema.clean(cloned, {mutate: false})) as T
}

export async function cleanEchoesSchema<T>(schema: unknown, value: unknown): Promise<T> {
  if (isSimpleSchemaLike(schema)) {
    return await cleanSimpleSchema<T>(schema, value)
  }
  if (runtime.schema) {
    return await runtime.schema.clean<T>(schema, value)
  }
  throw new Error(
    'Echoes received a schema it cannot execute. Use a SimpleSchema-compatible object or configure an Echoes schema adapter.',
  )
}

export async function parseEchoesSchema<T>(schema: unknown, value: unknown): Promise<T> {
  if (isSimpleSchemaLike(schema)) {
    const cleaned = await cleanSimpleSchema<T>(schema, value)
    await schema.validate(cleaned)
    return cleaned
  }
  if (runtime.schema) {
    return await runtime.schema.parse<T>(schema, value)
  }
  throw new Error(
    'Echoes received a schema it cannot execute. Use a SimpleSchema-compatible object or configure an Echoes schema adapter.',
  )
}

export function createEchoesValidationError(info: EchoesErrorInfo): Error {
  return runtime.createValidationError
    ? runtime.createValidationError(info)
    : new EchoesValidationError(info.validationErrors || {}, info.labels)
}

export function createEchoesUserError(info: EchoesErrorInfo): Error {
  return runtime.createUserError
    ? runtime.createUserError(info)
    : new EchoesUserError(info.error, info.message, info.extra)
}
