import {hashObject} from '@orion-js/helpers'

export default function (name: string, params) {
  const hash = hashObject(params)
  const channelName = `${name}_${hash}`
  return channelName
}
