/* eslint-disable @typescript-eslint/ban-types */
import {Schema} from '@orion-js/schema'
import {getModelForClass} from './getModelForClass'

export function getSchemaForClass(target: any): Schema {
  return getModelForClass(target).getSchema()
}
