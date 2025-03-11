import {getSchemaFromTypedSchema} from '../getSchemaFromTypedSchema'
import {CurrentNodeInfo} from '../types/schema'

const convertOnParam = (info: CurrentNodeInfo, paramName: string) => {
  if (!info[paramName]) return

  const type = info[paramName].type as any
  if (!type) return

  info[paramName].type = getSchemaFromTypedSchema(type)
}

export const convertTypedSchema = (info: CurrentNodeInfo) => {
  convertOnParam(info, 'schema')
  convertOnParam(info, 'currentSchema')
}
