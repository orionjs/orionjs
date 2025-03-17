import {getInstance, Service} from '@orion-js/services'
import {createEventJob, defineJob} from '../defineJob'
import type {CreateEventJobOptions, JobDefinition, RecurrentJobDefinition} from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const jobsMetadata = new Map<any, Record<string, any>>()

export function Jobs() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)

    context.addInitializer(function (this) {
      serviceMetadata.set(this, {_serviceType: 'jobs'})
    })
  }
}

export function RecurrentJob(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function RecurrentJob(
  options: Omit<RecurrentJobDefinition, 'resolve' | 'type'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function RecurrentJob(options = {}) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const jobs = jobsMetadata.get(this) || {}

      if (context.kind === 'method') {
        jobs[propertyKey] = defineJob({
          ...options,
          type: 'recurrent',
          resolve: this[propertyKey].bind(this),
        })
      }

      if (context.kind === 'field') {
        jobs[propertyKey] = this[propertyKey]
      }

      jobsMetadata.set(this, jobs)
    })

    return method
  }
}

export function EventJob(): (
  method: any,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext,
) => any
export function EventJob(
  options: Omit<CreateEventJobOptions<any>, 'resolve'>,
): (method: any, context: ClassMethodDecoratorContext) => any
export function EventJob(options = {}) {
  return (method: any, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const propertyKey = String(context.name)

    context.addInitializer(function (this) {
      const jobs = jobsMetadata.get(this) || {}

      if (context.kind === 'method') {
        jobs[propertyKey] = createEventJob({
          ...options,
          resolve: this[propertyKey].bind(this),
        })
      }

      if (context.kind === 'field') {
        jobs[propertyKey] = this[propertyKey]
      }

      jobsMetadata.set(this, jobs)
    })

    return method
  }
}

export function getServiceJobs(target: any): {
  [key: string]: JobDefinition
} {
  const instance = getInstance(target)

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Jobs to getServiceJobs')
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'jobs') {
    throw new Error('You must pass a class decorated with @Jobs to getServiceJobs')
  }

  const jobsMap = jobsMetadata.get(instance) || {}

  return jobsMap
}

/**
 * Logs
 * after event job {
  job1: { type: 'event', resolve: [Function: bound job1] AsyncFunction }
}
before recurrent job Map(1) {
  ExampleJobsService {} => {
    job1: { type: 'event', resolve: [Function: bound job1] AsyncFunction }
  }
}
before recurrent job undefined
after recurrent job {
  job2: {
    runEvery: 1000,
    type: 'recurrent',
    resolve: [Function: bound job2] AsyncFunction,
    priority: 100
  }
}
{
  serviceJobs: {
    job2: {
      runEvery: 1000,
      type: 'recurrent',
      resolve: [Function: bound job2] AsyncFunction,
      priority: 100
    }
  }
}
 */
