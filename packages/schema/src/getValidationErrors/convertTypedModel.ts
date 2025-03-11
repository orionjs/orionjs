import { getSchemaFromTypedModel } from '../getSchemaFromTypedModel'
import { CurrentNodeInfo } from '../types/schema'

const convertOnParam = (info: CurrentNodeInfo, paramName: string) => {
  if (!info[paramName]) return

  const type = info[paramName].type as any
  if (!type) return

  info[paramName].type = getSchemaFromTypedModel(type)
}

export const convertTypedModel = (info: CurrentNodeInfo) => {
  convertOnParam(info, 'schema')
  convertOnParam(info, 'currentSchema')
}
