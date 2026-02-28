import {getInstance, Service} from '@orion-js/services'
import {createEventJob, defineJob} from '../defineJob'
import type {CreateEventJobOptions, JobDefinition, RecurrentJobDefinition} from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, {_serviceType: string}>()
const jobsMetadata = new Map<any, Record<string, any>>()
const jobEntriesByClass = new Map<Function, Record<string, (instance: any) => any>>()
let pendingJobEntries: Record<string, (instance: any) => any> = {}

export function Jobs() {
  return (target: any, context: ClassDecoratorContext<any>) => {
    Service()(target, context)
    serviceMetadata.set(target, {_serviceType: 'jobs'})

    if (Object.keys(pendingJobEntries).length > 0) {
      jobEntriesByClass.set(target, pendingJobEntries)
      pendingJobEntries = {}
    }
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

    if (context.kind === 'method') {
      pendingJobEntries[propertyKey] = (instance: any) =>
        defineJob({
          ...options,
          type: 'recurrent',
          resolve: instance[propertyKey].bind(instance),
        })
    }

    if (context.kind === 'field') {
      pendingJobEntries[propertyKey] = (instance: any) => instance[propertyKey]
    }

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

    if (context.kind === 'method') {
      pendingJobEntries[propertyKey] = (instance: any) =>
        createEventJob({
          ...options,
          resolve: instance[propertyKey].bind(instance),
        })
    }

    if (context.kind === 'field') {
      pendingJobEntries[propertyKey] = (instance: any) => instance[propertyKey]
    }

    return method
  }
}

function initializeJobsIfNeeded(instance: any) {
  if (jobsMetadata.has(instance)) return
  const entries = jobEntriesByClass.get(instance.constructor) || {}
  const jobs: Record<string, any> = {}
  for (const [key, setup] of Object.entries(entries)) {
    jobs[key] = setup(instance)
  }
  jobsMetadata.set(instance, jobs)
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

  initializeJobsIfNeeded(instance)

  const jobsMap = jobsMetadata.get(instance) || {}

  return jobsMap
}
