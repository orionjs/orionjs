import {OrionRequest, RouteType} from './../types'
import {getViewer} from './../viewer'
import {runWithOrionAsyncContext, updateOrionAsyncContext} from '@orion-js/logger'
import express from 'express'
import {isNil, type} from 'rambdax'
import {internalGetEnv} from '@orion-js/env'
import {sleep} from '@orion-js/helpers'
import {cleanAndValidate} from '@orion-js/schema'
import {onError} from '../errors'
const simulateLatency = internalGetEnv('simulate_latency', 'SIMULATE_LATENCY')

export async function executeRequest(
  route: RouteType<any>,
  req: OrionRequest,
  res: express.Response,
) {
  if (simulateLatency) {
    const time = Number.parseInt(simulateLatency)
    if (time) {
      const min = time * 0.9
      const max = time * 1.1
      await sleep(Math.floor(Math.random() * (max - min + 1)) + min)
    }
  }

  try {
    const viewer = await getViewer(req)

    if (route.queryParams) {
      req.query = await cleanAndValidate(route.queryParams ?? {}, req.query)
    }

    if (route.bodyParams) {
      req.body = await cleanAndValidate(route.bodyParams ?? {}, req.body)
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

    const result = await runWithOrionAsyncContext(context, async () => {
      updateOrionAsyncContext({viewer})
      return await route.resolve(req, res, viewer)
    })
    if (!result) return

    // add status code to response
    if (result.statusCode) {
      res.status(result.statusCode)
    }

    // add headers to response
    if (result.headers) {
      for (const key in result.headers) {
        res.setHeader(key, result.headers[key])
      }
    }

    // add body to response
    if (!isNil(result.body)) {
      let body = result.body

      if (route.returns) {
        body = await cleanAndValidate(route.returns, result.body)
      }

      if (type(body) === 'Object') {
        res.json(body)
      } else {
        res.send(body)
      }
    }
  } catch (error) {
    await onError(req, res, error)
  }
}
