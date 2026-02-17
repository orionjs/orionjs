import {internalGetEnv} from '@orion-js/env'
import {sleep} from '@orion-js/helpers'
import {runWithOrionAsyncContext, updateOrionAsyncContext} from '@orion-js/logger'
import {cleanAndValidate} from '@orion-js/schema'
import express from 'express'
import {onError} from '../errors'
import {OrionRequest, RouteType} from './../types'
import {getViewer} from './../viewer'

const simulateLatency = internalGetEnv('simulate_latency', 'SIMULATE_LATENCY')
const simulateLatencyMs = Number.parseInt(simulateLatency, 10)
const hasSimulateLatency = Number.isFinite(simulateLatencyMs) && simulateLatencyMs > 0
const latencyMinMs = hasSimulateLatency ? Math.floor(simulateLatencyMs * 0.9) : 0
const latencyMaxMs = hasSimulateLatency ? Math.ceil(simulateLatencyMs * 1.1) : 0

const objectToString = Object.prototype.toString
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return objectToString.call(value) === '[object Object]'
}

export async function executeRequest(
  route: RouteType<any>,
  req: OrionRequest,
  res: express.Response,
) {
  try {
    if (hasSimulateLatency) {
      const delay = Math.floor(Math.random() * (latencyMaxMs - latencyMinMs + 1)) + latencyMinMs
      await sleep(delay)
    }

    const viewer = await getViewer(req)

    if (route.queryParams) {
      req.query = await cleanAndValidate(route.queryParams, req.query)
    }

    if (route.bodyParams) {
      req.body = await cleanAndValidate(route.bodyParams, req.body)
    }

    const context = {
      controllerType: 'route' as const,
      routeName: route.path,
      pathname: req.path,
      viewer,
      params: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
    }

    const result = await runWithOrionAsyncContext(context, () => {
      updateOrionAsyncContext({viewer})
      return route.resolve(req, res, viewer)
    })
    if (!result) return

    // add status code to response
    if (result.statusCode) {
      res.status(result.statusCode)
    }

    // add headers to response
    if (result.headers) {
      res.set(result.headers)
    }

    // add body to response
    if (result.body !== null && result.body !== undefined) {
      let body = result.body

      if (route.returns) {
        body = await cleanAndValidate(route.returns, result.body)
      }

      if (isPlainObject(body)) {
        res.json(body)
      } else {
        res.send(body)
      }
    }
  } catch (error) {
    await onError(req, res, error)
  }
}
