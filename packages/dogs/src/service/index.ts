import {getInstance, Service} from '@orion-js/services'
import {defineJob} from '../defineJob'
import {JobDefinition} from '../types'

export function Jobs(): ClassDecorator {
  return function (target: any) {
    Service()(target)
    target.prototype.service = target
  }
}

export interface JobsPropertyDescriptor extends Omit<PropertyDecorator, 'value'> {
  value?: JobDefinition['resolve']
}

export function Job(options: Omit<JobDefinition, 'resolve'>) {
  return function (target: any, propertyKey: string, descriptor: JobsPropertyDescriptor) {
    if (!descriptor.value) throw new Error(`You must pass resolver function to ${propertyKey}`)

    target.echoes = target.echoes || {}
    target.echoes[propertyKey] = defineJob({
      ...options,
      resolve: async (params, viewer) => {
        const instance: any = getInstance(target.service)
        return await instance[propertyKey](params, viewer)
      }
    })
  }
}

export function getServiceJobs(target: any): {[key: string]: JobDefinition} {
  if (!target.prototype) {
    throw new Error('You must pass a class to getServiceRoutes')
  }

  return target.prototype.echoes || {}
}
