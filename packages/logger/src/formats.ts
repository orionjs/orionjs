import {format, transports} from 'winston'
import util from 'node:util'
import {isEmpty} from 'lodash'
import opentelemetry, {Span} from '@opentelemetry/api'

const {metadata, timestamp, json, colorize, combine, printf} = format

const opentelemetryContext = format(info => {
  const activeSpan: Span & {name?: string} = opentelemetry.trace.getActiveSpan()
  if (activeSpan) {
    const spanContex = activeSpan.spanContext()
    if (activeSpan.name && !info.context) {
      info.context = activeSpan.name
    }
    const fields = {
      trace_id: spanContex.traceId,
      span_id: spanContex.spanId,
      trace_flags: `0${spanContex.traceFlags.toString(16)}`,
    }
    Object.assign(info, fields)
  }
  return info
})

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
      request_id: label,
    },
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
  opentelemetryContext(),
  metaError(),
  timestamp(),
  printf(info => {
    // console.log(info)

    const date = new Date(info.timestamp)
    const timeLabel = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    const fileNameLabel = info.fileName ? `[${info.fileName}]` : ''
    const stack = info.stack ? `\n${info.stack}` : ''
    const value = getMetadataText(info.metadata)
    const traceId = info.trace_id
      ? `${String(info.trace_id).substring(0, 8)}@${String(info.span_id).substring(0, 8)}`
      : ''
    const context = `${info.context || ''} ${traceId}`.trim()

    return `[${info.level}] [${timeLabel}] [${context}] ${fileNameLabel} ${info.message} ${value} ${stack}`
  }),
)

export const textConsoleTransport = new transports.Console({
  handleExceptions: true,
  format: textConsoleFormat,
})

export const jsonConsoleFormat = combine(
  metadata({fillExcept: ['fileName', 'level', 'message']}),
  opentelemetryContext(),
  metaError(),
  timestamp(),
  json(),
)

export const jsonConsoleTransport = new transports.Console({
  handleExceptions: true,
  format: jsonConsoleFormat,
})
