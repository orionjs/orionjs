import {Route} from './../types'
import {onError} from '../errors'
import {getViewer} from './../viewer'
import express from 'express'
import {isPlainObject} from 'lodash'

export async function executeRequest(route: Route, req: express.Request, res: express.Response) {
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
    if (result.body) {
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
