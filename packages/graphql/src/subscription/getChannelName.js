import crypto from 'crypto'

export default function(name, params, viewer) {
  const json = JSON.stringify(params)
  const hash = crypto
    .createHash('sha1')
    .update(json)
    .digest('base64')
  const channelName = `${name}_${hash}`
  return channelName
}
