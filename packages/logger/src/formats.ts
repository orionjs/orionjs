import {format, transports} from 'winston'
import util from 'util'
import {isEmpty} from 'lodash'

const {metadata, timestamp, json, colorize, combine, printf} = format

const metaError = format(info => {
  if (info?.metadata?.value?.error instanceof Error) {
    info.stack = info?.metadata?.value?.error.stack
    info.errorMessage = info?.metadata?.value?.error.message
    delete info?.metadata?.value?.error
  }

  if (info?.metadata?.value instanceof Error) {
    info.stack = info?.metadata?.value.stack
    info.errorMessage = info?.metadata?.value.message
    delete info?.metadata?.value
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

function getMetadataText(metadata: any) {
  const {value, ...rest} = metadata
  if (isEmpty(rest)) {
    if (typeof value === 'undefined') return ''
    return util.inspect(value)
  }
  return `${util.inspect(value)} ${util.inspect(rest)}`
}

export const textConsoleFormat = combine(
  colorize(),
  metadata({fillExcept: ['fileName', 'level', 'message', 'stack']}),
  metaError(),
  timestamp(),
  printf(info => {
    // console.log(info)

    const date = new Date(info.timestamp)
    const timeLabel = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    const fileNameLabel = info.fileName ? `[${info.fileName}]` : ''
    const stack = info.stack ? `\n${info.stack}` : ''
    const value = getMetadataText(info.metadata)

    return `[${info.level}] [${timeLabel}] ${fileNameLabel} ${info.message} ${value} ${stack}`
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
