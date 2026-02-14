import {logger} from '@orion-js/logger'
import {registerTRPCRoute} from '@orion-js/trpc'
import {startApp} from './config'
import {t} from './config/trpc'
import exampleComponent from './exampleComponent'

const {procedures} = await startApp([exampleComponent])
const appRouter = t.router(procedures)

registerTRPCRoute({appRouter})
logger.info('tRPC started at /trpc')

export type AppRouter = typeof appRouter
