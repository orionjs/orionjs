import {format, transports} from 'winston'
import {opentelemetryContext, metaError, asyncContextFormat} from './winstonFormats'
import {getMetadataText} from './getMetadataText'
import {formatStack} from './formatStack'
import {enrichWithAsyncContext} from './enrichWithAsyncContext'

const {metadata, timestamp, json, colorize, combine, printf} = format

export const textConsoleFormat: any = combine(
  colorize(),
  metadata({fillExcept: ['fileName', 'level', 'message', 'stack']}),
  opentelemetryContext(),
  asyncContextFormat(),
  metaError(),
  timestamp(),
  printf((info: any) => {
    const date = new Date(info.timestamp)
    const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
    const fileNameLabel = info.fileName ? `[${info.fileName}]` : ''
    const stack = info.stack ? formatStack(info.stack) : ''
    const value = getMetadataText(info.metadata)
    const contextLabel = info.context ? `[${info.context}]` : ''

    const mainLine = [
      `[${info.level}]`,
      `[${timeLabel}]`,
      contextLabel,
      fileNameLabel,
      info.message,
    ]
      .filter(Boolean)
      .join(' ')

    const valueLine = value ? `\n${value}` : ''

    return `${mainLine}${valueLine}${stack}`
  }),
)

export const textConsoleTransport = new transports.Console({
  handleExceptions: true,
  format: textConsoleFormat,
})

const messageFirstFormat = format((info: any) => {
  const {level, message, ...rest} = info
  return {level, message, ...rest}
})

export const jsonConsoleFormat: any = combine(
  metadata({fillExcept: ['fileName', 'level', 'message']}),
  opentelemetryContext(),
  enrichWithAsyncContext(),
  metaError(),
  timestamp(),
  messageFirstFormat(),
  json(),
)

export const jsonConsoleTransport = new transports.Console({
  handleExceptions: true,
  format: jsonConsoleFormat,
})
