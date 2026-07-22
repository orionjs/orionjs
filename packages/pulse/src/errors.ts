export class PulseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PulseError'
  }
}

export class PulseConfigurationError extends PulseError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PulseConfigurationError'
  }
}

export class PulseIndexError extends PulseError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PulseIndexError'
  }
}

export class PulseLockLostError extends PulseError {
  constructor(message: string) {
    super(message)
    this.name = 'PulseLockLostError'
  }
}
