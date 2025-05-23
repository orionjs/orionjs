import {CloneOptions} from '@orion-js/models'
import {Constructor} from '../utils/interfaces'
import {cloneSchema, getSchemaFromAnyOrionForm, Schema} from '@orion-js/schema'

export interface CloneSchemaClassOptions<
  TClass,
  TFields extends (keyof TClass)[] | undefined = undefined,
> {
  name: string
  pickFields?: TFields
  mapFields?: CloneOptions['mapFields']
  extendSchema?: CloneOptions['extendSchema']
}

/**
 * @deprecated Use `cloneSchema` instead
 */
export function cloneSchemaClass<TClass, TFields extends (keyof TClass)[] | undefined = undefined>(
  inputType: Constructor<TClass>,
  options: CloneSchemaClassOptions<TClass, TFields>,
): Schema & {
  __tsFieldType: TFields extends undefined ? TClass : Pick<TClass, TFields[number]>
} {
  const schema = getSchemaFromAnyOrionForm(inputType) as Schema

  const newSchema = cloneSchema({
    schema,
    name: options.name,
    pickFields: options.pickFields as any as string[],
    mapFields: options.mapFields,
    extendSchema: options.extendSchema,
  })

  return newSchema as any
}
