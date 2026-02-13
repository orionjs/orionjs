import './options'
import {type Component, mergeComponents} from '@orion-js/components'
import startEchoes from './echoes'
import startGraphQL from './graphql'
import startHttp from './http'
import startJobs from './jobs'
import startTrpc from './trpc'
import './migrations'

export async function startApp<T extends Component<any>[]>(components: [...T]) {
  const controllers = mergeComponents(components)

  startEchoes(controllers.echoes)
  startGraphQL(controllers.resolvers, controllers.modelResolvers)
  startHttp(controllers.routes)
  startJobs(controllers.jobs)
  const {router} = startTrpc(controllers.trpc)

  return {router}
}
