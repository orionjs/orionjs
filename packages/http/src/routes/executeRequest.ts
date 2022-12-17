import {RouteType} from './../types'
import {onError} from '../errors'
import {getViewer} from './../viewer'
import express from 'express'
import {isNil, isPlainObject, random} from 'lodash'
import {internalGetEnv} from '@orion-js/env'
import {sleep} from '@orion-js/helpers'

const simulateLatency = internalGetEnv('simulate_latency', 'SIMULATE_LATENCY')

export async function executeRequest(
  route: RouteType,
  req: express.Request,
  res: express.Response
) {
  if (simulateLatency) {
    const time = parseInt(simulateLatency)
    if (time) {
      await sleep(random(time * 0.9, time * 1.1))
    }
  }

  try {
    const viewer = await getViewer(req)
    const result = await route.resolve(req, res, viewer)
    if (!result) return

    // add status code to response
    if (result.statusCode) {
      res.status(result.statusCode)
    }

    // add headers to response
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key])
      })
    }

    // add body to response
    if (!isNil(result.body)) {
      if (isPlainObject(result.body)) {
        res.json(result.body)
      } else {
        res.send(result.body)
      }
    }
  } catch (error) {
    await onError(req, res, error)
  }
}
