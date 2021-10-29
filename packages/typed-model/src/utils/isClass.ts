// eslint-disable-next-line @typescript-eslint/ban-types
export const isClass = (type: Function) => /^class\s/.test(Function.prototype.toString.call(type))
