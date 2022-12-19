import {Model} from '@orion-js/models'
import {CloneOptions} from '@orion-js/models'
import {Constructor} from '../utils/interfaces'
import {getModelForClass} from './getModelForClass'

export interface CloneSchemaClassOptions<TClass, TFields extends keyof TClass> {
  name: string
  pickFields: readonly TFields[]
  mapFields?: CloneOptions['mapFields']
  extendSchema?: CloneOptions['extendSchema']
}

/**
 * This function returns a cloned model but the type is a subset of the original Schema.
 * To use the type of the cloned schema use `typeof ClonedModel.type`
 *
 * Example:
 * ```ts
 * const ClonedModel = cloneSchemaClass(Schema, {
 *   name: 'ClonedSchema',
 *   pickFields: ['name'] as const
 * })
 * type ClonedType = typeof ClonedModel.type
 * ```
 */
export function cloneSchemaClass<TClass, TFields extends keyof TClass>(
  schema: Constructor<TClass>,
  options: CloneSchemaClassOptions<TClass, TFields>
): Model<Pick<TClass, TFields>> {
  const model = getModelForClass(schema)

  const newModel: Model<Pick<TClass, TFields>> = model.clone({
    name: options.name,
    pickFields: options.pickFields as any as string[],
    mapFields: options.mapFields,
    extendSchema: options.extendSchema
  })

  return newModel
}
