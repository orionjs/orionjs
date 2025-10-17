import {format, Logform} from 'winston'
import opentelemetry, {Span} from '@opentelemetry/api'
import {getAsyncContextLabel} from './getAsyncContextLabel'

export const opentelemetryContext: Logform.FormatWrap = format(info => {
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

export const metaError: Logform.FormatWrap = format((info: any) => {
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

export const asyncContextFormat: Logform.FormatWrap = format(info => {
  if (!info.context) {
    info.context = getAsyncContextLabel()
  }
  return info
})

export const sentryFormat: Logform.FormatWrap = format(info => {
  const {path, label, ...extra} = info
  return {
    ...extra,
    tags: {
      path: path || '',
      request_id: label,
    },
  }
})
