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
 * It will work as a Model but the type will not be the Type of the Model.
 *
 * You can use the return variable as a Model and you `typeof returnType` will be the class
 * for type checking.
 *
 * Remember that in runtime this will be a Model and not the class.
 */
export function cloneSchemaClass<TClass, TFields extends keyof TClass>(
  schema: Constructor<TClass>,
  options: CloneSchemaClassOptions<TClass, TFields>
) {
  const model = getModelForClass(schema)

  const newModel = model.clone({
    name: options.name,
    pickFields: options.pickFields as any as string[],
    mapFields: options.mapFields,
    extendSchema: options.extendSchema
  })

  return newModel as any as Pick<TClass, TFields>
}
