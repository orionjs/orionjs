import './options'
import startEchoes from './echoes'
import startGraphQL from './graphql'
import startHttp from './http'
import startJobs from './jobs'
import {Component, mergeComponents} from '@orion-js/components'

export async function startApp(components: Component[]) {
  const controllers = mergeComponents(components)

  startEchoes(controllers.echoes)
  startGraphQL(controllers.resolvers, controllers.modelResolvers)
  startHttp(controllers.routes)
  startJobs(controllers.jobs)
}
