/* eslint-disable @typescript-eslint/ban-types */
import {Schema} from '@orion-js/schema'
import {Constructor} from '../utils/interfaces'
import {getSchemaForClassRecursive} from './helpers/processSchemaForProp'

export function getSchemaForClass<TClass>(target: Constructor<TClass>): Schema {
  return getSchemaForClassRecursive(target)
}
