import {CurrentNodeInfo} from '../types/schema'

export function isClass(obj: any) {
  const isCtorClass = obj.constructor && obj.constructor.toString().substring(0, 5) === 'class'
  if (obj.prototype === undefined) {
    return isCtorClass
  }
  const isPrototypeCtorClass =
    obj.prototype.constructor &&
    obj.prototype.constructor.toString &&
    obj.prototype.constructor.toString().substring(0, 5) === 'class'
  return isCtorClass || isPrototypeCtorClass
}

const convertOnParam = (info: CurrentNodeInfo, paramName: string) => {
  if (!info[paramName]) return

  const type = info[paramName].type as any

  if (!type) return
  if (typeof type !== 'function') return
  if (!isClass(type)) return
  if (!type.getModel || !type.__schemaId) return

  info[paramName].type = type.getModel().getCleanSchema()
}

export const convertTypedModel = (info: CurrentNodeInfo) => {
  convertOnParam(info, 'schema')
  convertOnParam(info, 'currentSchema')
}
