import {getInstance, Service} from '@orion-js/services'
import {AnyProcedure, TRPCRouterRecord} from '@trpc/server'

const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const proceduresMetadata = new WeakMap<any, Record<string, any>>()

export function Procedures() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'trpc-procedures'})
  }
}

/**
 * @deprecated Use `Procedures` instead
 */
export const TProcedures = Procedures

export function TQuery() {
  return (method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: any) {
      const procedures = proceduresMetadata.get(this) || {}
      procedures[propertyKey] = this[propertyKey]
      proceduresMetadata.set(this, procedures)
    })

    return method
  }
}

export function TMutation() {
  return (method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: any) {
      const procedures = proceduresMetadata.get(this) || {}
      procedures[propertyKey] = this[propertyKey]
      proceduresMetadata.set(this, procedures)
    })

    return method
  }
}

export function TPaginatedQuery() {
  return (method: any, context: ClassFieldDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this: any) {
      const procedures = proceduresMetadata.get(this) || {}
      procedures[propertyKey] = this[propertyKey]
      proceduresMetadata.set(this, procedures)
    })

    return method
  }
}

/**
 * Extracts only the tRPC procedure fields (or nested router records) from a class instance type
 */
export type ExtractProcedures<T> = {
  [K in keyof T as T[K] extends AnyProcedure | TRPCRouterRecord ? K : never]: T[K]
}

/**
 * Gets the procedures from a class decorated with @Procedures.
 * Returns a TRPCRouterRecord that can be passed to t.router().
 */
export function getTProcedures<T extends object>(
  target: new (...args: any[]) => T,
): ExtractProcedures<T> {
  const instance = getInstance(target)

  const className = instance.constructor.name
  const errorMessage = `You must pass a class decorated with @Procedures to getTProcedures. Check the class ${className}`

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error(errorMessage)
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata?._serviceType !== 'trpc-procedures') {
    throw new Error(`${errorMessage}. Got class type ${instanceMetadata?._serviceType}`)
  }

  return (proceduresMetadata.get(instance) || {}) as ExtractProcedures<T>
}

type ProcedureClass = new (...args: any[]) => any

/**
 * Merges multiple @Procedures classes into a single typed procedures object.
 * This preserves all TypeScript types for use with inferRouterInputs/inferRouterOutputs.
 *
 * @example
 * const procedures = mergeProcedures([UserProcedures, PostProcedures])
 * const appRouter = t.router(procedures)
 * export type AppRouter = typeof appRouter
 */
export function mergeProcedures<T1 extends ProcedureClass>(
  classes: [T1],
): ExtractProcedures<InstanceType<T1>>
export function mergeProcedures<T1 extends ProcedureClass, T2 extends ProcedureClass>(
  classes: [T1, T2],
): ExtractProcedures<InstanceType<T1>> & ExtractProcedures<InstanceType<T2>>
export function mergeProcedures<
  T1 extends ProcedureClass,
  T2 extends ProcedureClass,
  T3 extends ProcedureClass,
>(
  classes: [T1, T2, T3],
): ExtractProcedures<InstanceType<T1>> &
  ExtractProcedures<InstanceType<T2>> &
  ExtractProcedures<InstanceType<T3>>
export function mergeProcedures<
  T1 extends ProcedureClass,
  T2 extends ProcedureClass,
  T3 extends ProcedureClass,
  T4 extends ProcedureClass,
>(
  classes: [T1, T2, T3, T4],
): ExtractProcedures<InstanceType<T1>> &
  ExtractProcedures<InstanceType<T2>> &
  ExtractProcedures<InstanceType<T3>> &
  ExtractProcedures<InstanceType<T4>>
export function mergeProcedures<
  T1 extends ProcedureClass,
  T2 extends ProcedureClass,
  T3 extends ProcedureClass,
  T4 extends ProcedureClass,
  T5 extends ProcedureClass,
>(
  classes: [T1, T2, T3, T4, T5],
): ExtractProcedures<InstanceType<T1>> &
  ExtractProcedures<InstanceType<T2>> &
  ExtractProcedures<InstanceType<T3>> &
  ExtractProcedures<InstanceType<T4>> &
  ExtractProcedures<InstanceType<T5>>
export function mergeProcedures(classes: ProcedureClass[]): TRPCRouterRecord {
  const merged: TRPCRouterRecord = {}

  for (const cls of classes) {
    const procedures = getTProcedures(cls)
    Object.assign(merged, procedures)
  }

  return merged
}
