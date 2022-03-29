import {format, transports} from 'winston'
import util from 'util'

const {metadata, timestamp, json, colorize, combine, printf} = format

const metaError = format(info => {
  if (info.metadata && info.metadata.error && info.metadata.error instanceof Error) {
    info.stack = info.metadata.error.stack
    info.metadata.error = info.metadata.error.message
  }
  return info
})

export const sentryFormat = format(info => {
  const {path, label, ...extra} = info
  return {
    ...extra,
    tags: {
      path: path || '',
      request_id: label
    }
  }
})

export const textConsoleFormat = combine(
  colorize(),
  metadata({fillExcept: ['fileName', 'level', 'message', 'stack']}),
  metaError(),
  timestamp(),
  printf(info => {
    return `[${info.level}] [${info.timestamp}] ${info.fileName ? `[${info.fileName}]` : ''} ${
      info.message
    } ${info.stack ? `\n${info.stack}` : ''} ${util.inspect(info.metadata)}`
  })
)

export const textConsoleTransport = new transports.Console({
  handleExceptions: true,
  format: textConsoleFormat
})

export const jsonConsoleFormat = combine(
  metadata({fillExcept: ['fileName', 'level', 'message']}),
  metaError(),
  timestamp(),
  json()
)

export const jsonConsoleTransport = new transports.Console({
  handleExceptions: true,
  format: jsonConsoleFormat
})
