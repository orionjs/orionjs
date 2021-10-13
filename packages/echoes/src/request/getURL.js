import config from '../config'

export default function (serviceName) {
  const url = config.requests.services[serviceName]

  if (!url) {
    throw new Error(`No URL found in echoes config for service ${serviceName}`)
  }

  return url
}
