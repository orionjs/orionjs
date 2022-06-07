import {format, transports} from 'winston'
import util from 'util'
import {isEmpty} from 'lodash'

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
    } ${info.stack ? `\n${info.stack}` : ''} ${
      isEmpty(info.metadata?.value) ? '' : util.inspect(info.metadata?.value)
    } ${isEmpty(info.metadata?.parent) ? '' : util.inspect(info.metadata?.parent)}`
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
