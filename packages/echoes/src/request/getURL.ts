import config from '../config'

export default function (serviceName: string): string {
  if (serviceName.startsWith('http')) return serviceName

  const url = config?.requests?.services[serviceName]

  if (!url) {
    throw new Error(`No URL found in echoes config for service ${serviceName}`)
  }

  return url
}
