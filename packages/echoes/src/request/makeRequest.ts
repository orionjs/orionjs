import http from 'node:http'
import https from 'node:https'
import {RequestMaker} from '../types'

async function executeWithRetries<T>(
  callback: () => Promise<T>,
  retries = 0,
  delayMs = 200,
): Promise<T> {
  try {
    return await callback()
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise(resolve => setTimeout(resolve, delayMs))
    return await executeWithRetries(callback, retries - 1, delayMs)
  }
}

async function postJSON(
  urlValue: string,
  data: unknown,
  timeout?: number,
  redirectsRemaining = 5,
): Promise<{statusCode: number; data: object}> {
  const url = new URL(urlValue)
  const body = JSON.stringify(data)
  const transport = url.protocol === 'https:' ? https : http

  return await new Promise((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method: 'POST',
        headers: {
          'User-Agent': 'Orionjs-Echoes/1.1',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      response => {
        const chunks: Buffer[] = []
        const statusCode = response.statusCode || 0
        if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
          response.resume()
          if (redirectsRemaining <= 0) {
            reject(new Error('Echoes request exceeded the redirect limit'))
            return
          }
          resolve(
            postJSON(
              new URL(response.headers.location, url).toString(),
              data,
              timeout,
              redirectsRemaining - 1,
            ),
          )
          return
        }

        response.on('data', chunk => chunks.push(Buffer.from(chunk)))
        response.on('end', () => {
          try {
            const responseBody = Buffer.concat(chunks).toString('utf8')
            if (statusCode < 200 || statusCode >= 300) {
              reject(new Error(`Request failed with status code ${statusCode}`))
              return
            }
            resolve({
              statusCode,
              data: responseBody ? JSON.parse(responseBody) : {},
            })
          } catch (error) {
            reject(error)
          }
        })
      },
    )

    request.on('error', reject)
    if (timeout) {
      request.setTimeout(timeout, () => {
        request.destroy(new Error(`Echoes request timed out after ${timeout}ms`))
      })
    }
    request.end(body)
  })
}

export const makeRequest: RequestMaker = async options => {
  return await executeWithRetries(
    () => postJSON(options.url, options.data, options.timeout),
    options.retries || 0,
  )
}
