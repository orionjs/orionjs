const orionConfig = {
  logger: console
}

export default function config(newConfig) {
  if (newConfig) Object.assign(orionConfig, newConfig)

  if (!orionConfig.logger) {
    orionConfig.logger = {
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {}
    }
  }

  return orionConfig
}
