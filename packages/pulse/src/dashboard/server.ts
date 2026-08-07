import {spawn} from 'node:child_process'
import {createReadStream, existsSync} from 'node:fs'
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http'
import {dirname, extname, join, normalize, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {MongoClient, type MongoClientOptions} from 'mongodb'
import {
  type DashboardQuery,
  DashboardRepository,
  type DashboardStatus,
  resolveDashboardRange,
} from './repository'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 4111
const DEFAULT_PREFIX = 'orionjs.pulse'
export const DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS = 30_000

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

export interface DashboardServerOptions {
  connectionString: string
  databaseName?: string
  collectionPrefix?: string
  host?: string
  port?: number
  openBrowser?: boolean
  staticDirectory?: string
  queryTimeoutMs?: number
}

export interface DashboardServer {
  url: string
  close(): Promise<void>
}

function databaseFromConnectionString(connectionString: string) {
  const schemeIndex = connectionString.indexOf('://')
  if (schemeIndex === -1) return undefined
  const authorityAndPath = connectionString.slice(schemeIndex + 3).split('?')[0]
  const slashIndex = authorityAndPath.indexOf('/')
  if (slashIndex === -1) return undefined
  const databaseName = authorityAndPath.slice(slashIndex + 1)
  return databaseName ? decodeURIComponent(databaseName) : undefined
}

export function dashboardMongoClientOptions(queryTimeoutMs: number): MongoClientOptions {
  return {
    appName: '@orion-js/pulse-dashboard',
    readPreference: 'secondaryPreferred',
    timeoutMS: queryTimeoutMs,
    serverSelectionTimeoutMS: queryTimeoutMs,
    connectTimeoutMS: queryTimeoutMs,
    socketTimeoutMS: queryTimeoutMs,
    waitQueueTimeoutMS: queryTimeoutMs,
  }
}

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(value))
}

function parseStatus(value: string | null): DashboardStatus | undefined {
  return value === 'pending' || value === 'success' || value === 'error' ? value : undefined
}

function parseQuery(url: URL): DashboardQuery {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.max(
    1,
    Math.min(100, Number.parseInt(url.searchParams.get('limit') ?? '25', 10) || 25),
  )
  const lockState = url.searchParams.get('lockState')
  return {
    page,
    limit,
    status: parseStatus(url.searchParams.get('status')),
    topic: url.searchParams.get('topic') || undefined,
    consumerGroup: url.searchParams.get('consumerGroup') || undefined,
    search: url.searchParams.get('search') || undefined,
    lockState:
      lockState === 'queued' || lockState === 'active' || lockState === 'expired'
        ? lockState
        : undefined,
  }
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  repository: DashboardRepository,
  requestUrl: URL,
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    json(response, 405, {error: 'The Pulse dashboard API is read-only.'})
    return
  }

  const startedAt = performance.now()
  let data: unknown
  if (requestUrl.pathname === '/api/health') {
    data = {
      ok: true,
      database: repository.databaseName,
      collectionPrefix: repository.collectionPrefix,
      ...(await repository.ping()),
    }
  } else if (requestUrl.pathname === '/api/overview') {
    data = await repository.overview(resolveDashboardRange(requestUrl.searchParams.get('range')))
  } else if (requestUrl.pathname === '/api/topology') {
    data = await repository.topology(resolveDashboardRange(requestUrl.searchParams.get('range')))
  } else if (requestUrl.pathname === '/api/deliveries') {
    data = await repository.deliveries(parseQuery(requestUrl))
  } else if (requestUrl.pathname === '/api/history') {
    data = await repository.history(parseQuery(requestUrl))
  } else if (requestUrl.pathname === '/api/events') {
    data = await repository.events(parseQuery(requestUrl))
  } else if (requestUrl.pathname === '/api/subscriptions') {
    data = await repository.subscriptions(parseQuery(requestUrl))
  } else {
    json(response, 404, {error: 'API endpoint not found.'})
    return
  }

  json(response, 200, {
    data,
    meta: {
      generatedAt: new Date(),
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    },
  })
}

function serveStatic(response: ServerResponse, pathname: string, staticDirectory: string) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const normalizedPath = normalize(relativePath)
  const requestedPath = resolve(staticDirectory, normalizedPath)
  const staticRoot = resolve(staticDirectory)
  const fallback = join(staticRoot, 'index.html')
  const filePath =
    requestedPath.startsWith(`${staticRoot}/`) && existsSync(requestedPath)
      ? requestedPath
      : fallback

  if (!existsSync(filePath)) {
    json(response, 503, {
      error: 'Dashboard assets are missing. Reinstall or rebuild @orion-js/pulse.',
    })
    return
  }

  response.writeHead(200, {
    'cache-control': filePath.endsWith('index.html')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable',
    'content-security-policy':
      "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'",
    'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
  })
  createReadStream(filePath).pipe(response)
}

function launchBrowser(url: string) {
  const command =
    process.platform === 'darwin'
      ? {binary: 'open', args: [url]}
      : process.platform === 'win32'
        ? {binary: 'cmd', args: ['/c', 'start', '', url]}
        : {binary: 'xdg-open', args: [url]}
  const child = spawn(command.binary, command.args, {detached: true, stdio: 'ignore'})
  child.unref()
}

export async function startDashboardServer(
  options: DashboardServerOptions,
): Promise<DashboardServer> {
  if (!options.connectionString) throw new Error('A MongoDB connection string is required.')
  const databaseName =
    options.databaseName ?? databaseFromConnectionString(options.connectionString)
  if (!databaseName) {
    throw new Error('A database is required in the MongoDB URI or through --database.')
  }

  const host = options.host ?? DEFAULT_HOST
  const port = options.port ?? DEFAULT_PORT
  const collectionPrefix = options.collectionPrefix ?? DEFAULT_PREFIX
  const queryTimeoutMs = options.queryTimeoutMs ?? DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS
  if (!Number.isInteger(queryTimeoutMs) || queryTimeoutMs <= 0) {
    throw new Error('Dashboard query timeout must be a positive integer.')
  }
  const staticDirectory =
    options.staticDirectory ?? join(dirname(fileURLToPath(import.meta.url)), 'dashboard')
  const client = new MongoClient(
    options.connectionString,
    dashboardMongoClientOptions(queryTimeoutMs),
  )
  await client.connect()
  const repository = new DashboardRepository(
    client.db(databaseName, {readPreference: 'secondaryPreferred'}),
    collectionPrefix,
    queryTimeoutMs,
  )
  await repository.ping()

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`)
      if (requestUrl.pathname.startsWith('/api/')) {
        await handleApi(request, response, repository, requestUrl)
      } else if (request.method === 'GET' || request.method === 'HEAD') {
        serveStatic(response, requestUrl.pathname, staticDirectory)
      } else {
        json(response, 405, {error: 'Method not allowed.'})
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      json(response, 500, {error: message})
    }
  })

  await new Promise<void>((resolveListen, reject) => {
    const onError = (error: Error) => reject(error)
    server.once('error', onError)
    server.listen(port, host, () => {
      server.off('error', onError)
      resolveListen()
    })
  }).catch(async error => {
    await client.close()
    throw error
  })

  const address = server.address()
  const actualPort = typeof address === 'object' && address ? address.port : port
  const displayHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host
  const url = `http://${displayHost}:${actualPort}`
  if (options.openBrowser !== false) launchBrowser(url)

  return {
    url,
    close: async () => {
      await new Promise<void>((resolveClose, reject) => {
        server.close(error => (error ? reject(error) : resolveClose()))
      })
      await client.close()
    },
  }
}

interface ParsedArguments extends DashboardServerOptions {
  help: boolean
}

function parseArguments(args: string[]): ParsedArguments {
  const parsed: ParsedArguments = {
    connectionString: '',
    help: false,
    openBrowser: true,
  }
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') parsed.help = true
    else if (argument === '--no-open') parsed.openBrowser = false
    else if (argument === '--database' || argument === '-d') parsed.databaseName = args[++index]
    else if (argument === '--prefix') parsed.collectionPrefix = args[++index]
    else if (argument === '--host') parsed.host = args[++index]
    else if (argument === '--query-timeout-ms') {
      parsed.queryTimeoutMs = Number.parseInt(args[++index] ?? '', 10)
    } else if (argument === '--port' || argument === '-p') {
      parsed.port = Number.parseInt(args[++index] ?? '', 10)
    } else if (!argument.startsWith('-') && !parsed.connectionString) {
      parsed.connectionString = argument
    } else {
      throw new Error(`Unknown dashboard argument: ${argument}`)
    }
  }
  parsed.connectionString ||=
    process.env.MONGO_URL ?? process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? ''
  return parsed
}

function printHelp() {
  console.log(`Pulse dashboard

Usage:
  orion-pulse dashboard <mongodb-uri> [options]

Options:
  -d, --database <name>  Database name when it is not present in the URI
  -p, --port <port>      HTTP port (default: ${DEFAULT_PORT})
      --host <host>      Bind address (default: ${DEFAULT_HOST})
      --prefix <prefix>  Collection prefix (default: ${DEFAULT_PREFIX})
      --query-timeout-ms <ms>
                         Maximum time per MongoDB query (default: ${DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS})
      --no-open          Do not open the dashboard in a browser
  -h, --help             Show this help

The server is read-only and queries MongoDB directly.`)
}

async function runFromCommandLine() {
  const parsed = parseArguments(process.argv.slice(2))
  if (parsed.help) {
    printHelp()
    return
  }
  if (!parsed.connectionString) {
    printHelp()
    throw new Error('Missing MongoDB connection string.')
  }
  if (parsed.port !== undefined && (!Number.isInteger(parsed.port) || parsed.port < 0)) {
    throw new Error('--port must be zero or a positive integer.')
  }
  if (
    parsed.queryTimeoutMs !== undefined &&
    (!Number.isInteger(parsed.queryTimeoutMs) || parsed.queryTimeoutMs <= 0)
  ) {
    throw new Error('--query-timeout-ms must be a positive integer.')
  }

  const dashboard = await startDashboardServer(parsed)
  console.log(`\n  Pulse dashboard  ${dashboard.url}`)
  console.log(
    `  Database         ${parsed.databaseName ?? databaseFromConnectionString(parsed.connectionString)}`,
  )
  console.log(`  Collections      ${parsed.collectionPrefix ?? DEFAULT_PREFIX}.*`)
  console.log(
    `  Query timeout    ${parsed.queryTimeoutMs ?? DEFAULT_DASHBOARD_QUERY_TIMEOUT_MS} ms`,
  )
  console.log('  Read preference  secondaryPreferred')
  console.log('  Access           read-only\n')

  let closing = false
  const close = async () => {
    if (closing) return
    closing = true
    await dashboard.close()
  }
  process.once('SIGINT', () => void close())
  process.once('SIGTERM', () => void close())
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  runFromCommandLine().catch(error => {
    console.error(`Pulse dashboard failed: ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
