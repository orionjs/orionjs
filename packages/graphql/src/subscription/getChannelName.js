import crypto from 'crypto'
import sort from 'deep-sort-object'

export default function (name, params, viewer) {
  const json = JSON.stringify(sort(params))
  const hash = crypto.createHash('sha1').update(json).digest('base64')
  const channelName = `${name}_${hash}`
  return channelName
}
