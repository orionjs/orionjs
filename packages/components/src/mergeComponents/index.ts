import {Component} from '../components'
import {EchoesMap, getServiceEchoes} from '@orion-js/echoes'
import {
  getServiceModelResolvers,
  getServiceResolvers,
  getServiceSubscriptions,
  OrionSubscriptionsMap,
  ModelsResolversMap,
} from '@orion-js/graphql'
import {getServiceRoutes, RoutesMap} from '@orion-js/http'
import {getServiceJobs, JobsDefinition} from '@orion-js/dogs'
import {GlobalResolversMap} from '@orion-js/models'
import {generateId} from '@orion-js/helpers'

export interface MergedComponentControllers {
  echoes: EchoesMap
  resolvers: GlobalResolversMap
  modelResolvers: ModelsResolversMap
  subscriptions: OrionSubscriptionsMap
  routes: RoutesMap
  jobs: JobsDefinition
}

export function mergeComponentControllers(component: Component): MergedComponentControllers {
  const echoes: EchoesMap = {}

  if (component.controllers.echoes) {
    component.controllers.echoes.forEach(Controller => {
      const serviceEchoes = getServiceEchoes(Controller)
      for (const echoName in serviceEchoes) {
        const echo = serviceEchoes[echoName]
        echoes[echoName] = echo
      }
    })
  }

  const resolvers: GlobalResolversMap = {}

  if (component.controllers.resolvers) {
    component.controllers.resolvers.forEach(Controller => {
      const serviceResolvers = getServiceResolvers(Controller)
      for (const resolverName in serviceResolvers) {
        const resolver = serviceResolvers[resolverName]
        resolvers[resolverName] = resolver
      }
    })
  }

  const modelResolvers: ModelsResolversMap = {}

  if (component.controllers.modelResolvers) {
    component.controllers.modelResolvers.forEach(Controller => {
      const serviceModelResolvers = getServiceModelResolvers(Controller)
      for (const modelName in serviceModelResolvers) {
        const resolversForModel = serviceModelResolvers[modelName]
        modelResolvers[modelName] = modelResolvers[modelName] || {}
        for (const resolverName in resolversForModel) {
          modelResolvers[modelName][resolverName] = resolversForModel[resolverName]
        }
      }
    })
  }

  const subscriptions: OrionSubscriptionsMap = {}

  if (component.controllers.subscriptions) {
    component.controllers.subscriptions.forEach(Controller => {
      const serviceResolvers = getServiceSubscriptions(Controller)
      for (const subsrcriptionName in serviceResolvers) {
        const subsrcription = serviceResolvers[subsrcriptionName]
        subscriptions[subsrcriptionName] = subsrcription
      }
    })
  }

  const routes: RoutesMap = {}

  if (component.controllers.routes) {
    component.controllers.routes.forEach(Controller => {
      const serviceRoutes = getServiceRoutes(Controller)
      for (const routeName in serviceRoutes) {
        const resolver = serviceRoutes[routeName]
        if (routes[routeName]) {
          routes[routeName + generateId()] = resolver
        } else {
          routes[routeName] = resolver
        }
      }
    })
  }

  const jobs: JobsDefinition = {}

  if (component.controllers.jobs) {
    component.controllers.jobs.forEach(Controller => {
      const serviceJobs = getServiceJobs(Controller)
      for (const jobName in serviceJobs) {
        const resolver = serviceJobs[jobName]
        jobs[jobName] = resolver
      }
    })
  }

  return {
    echoes,
    resolvers,
    modelResolvers,
    subscriptions,
    routes,
    jobs,
  }
}

export function mergeComponents(components: Component[]): MergedComponentControllers {
  const mergedControllers: MergedComponentControllers = {
    echoes: {},
    resolvers: {},
    modelResolvers: {},
    subscriptions: {},
    routes: {},
    jobs: {},
  }

  components.forEach(component => {
    const componentControllers = mergeComponentControllers(component)
    mergedControllers.echoes = {
      ...mergedControllers.echoes,
      ...componentControllers.echoes,
    }
    mergedControllers.resolvers = {
      ...mergedControllers.resolvers,
      ...componentControllers.resolvers,
    }
    mergedControllers.modelResolvers = {
      ...mergedControllers.modelResolvers,
      ...componentControllers.modelResolvers,
    }
    mergedControllers.subscriptions = {
      ...mergedControllers.subscriptions,
      ...componentControllers.subscriptions,
    }
    mergedControllers.routes = {
      ...mergedControllers.routes,
      ...componentControllers.routes,
    }
    mergedControllers.jobs = {
      ...mergedControllers.jobs,
      ...componentControllers.jobs,
    }
  })

  return mergedControllers
}
