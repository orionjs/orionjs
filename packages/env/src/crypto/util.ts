// Written in 2014-2016 by Dmitry Chestnykh and Devi Mandiri.
// Public domain.

import {WithImplicitCoercion} from 'node:buffer'

function validateBase64(s: string) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s)) {
    throw new TypeError('invalid encoding')
  }
}

export const decodeUTF8 = (s: string | number | boolean) => {
  if (typeof s !== 'string') throw new TypeError('expected string')
  let i: number
  const d = unescape(encodeURIComponent(s))
  const b = new Uint8Array(d.length)
  for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i)
  return b
}

export const encodeUTF8 = (arr: string | any[]) => {
  let i: number
  const s = []
  for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]))
  return decodeURIComponent(escape(s.join('')))
}

export const encodeBase64 = (arr: Uint8Array<any>) => Buffer.from(arr).toString('base64')

export const decodeBase64 = (s: WithImplicitCoercion<string>) => {
  validateBase64(s as any)
  return new Uint8Array(Array.prototype.slice.call(Buffer.from(s, 'base64'), 0))
}
