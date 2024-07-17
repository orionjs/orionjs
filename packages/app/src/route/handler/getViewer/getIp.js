import isArray from 'lodash/isArray'

export default function getCallerIP(request) {
  if (!request) return null
  let ip =
    request.headers['x-forwarded-for'] ||
    request.connection.remoteAddress ||
    request.socket.remoteAddress ||
    request.connection.socket.remoteAddress
  ip = ip.split(',')[0]
  ip = ip.split(':').slice(-1) // in case the ip returned in a format: "::ffff:146.xxx.xxx.xxx"
  ip = isArray(ip) ? ip[0] : ip

  if (ip === '::1') {
    ip = '127.0.0.1'
  }
  if (ip === '1') {
    ip = '127.0.0.1'
  }
  return ip
}
