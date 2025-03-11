import { getInstance, Service } from '@orion-js/services'
import { defineJob } from '../defineJob'
import type { EventJobDefinition, JobDefinition, RecurrentJobDefinition } from '../types'

// Define metadata storage using WeakMaps
const serviceMetadata = new WeakMap<any, { _serviceType: string }>();
const jobsMetadata = new Map<any, Record<string, any>>();

export function Jobs() {
  return function (target: any, context: ClassDecoratorContext<any>) {
    Service()(target, context);

    context.addInitializer(function (this) {
      serviceMetadata.set(this, { _serviceType: 'jobs' });
    });
  };
}



export function RecurrentJob<This, TArgs extends any[], TReturn extends any>(options: Omit<RecurrentJobDefinition, 'resolve' | 'type'> = {}) {
  return function (
    method: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<This, typeof method>
  ) {
    const propertyKey = String(context.name);

    context.addInitializer(function (this: This) {
      const jobs = jobsMetadata.get(this) || {};


      jobs[propertyKey] = defineJob({
        ...options,
        type: 'recurrent',
        resolve: this[propertyKey].bind(this)
      })

      jobsMetadata.set(this, jobs);
    });

    return method;
  }
}

export function EventJob<This, TArgs extends any[], TReturn extends any>(options: Omit<EventJobDefinition, 'resolve' | 'type'> = {}) {
  return function (
    method: (this: This, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<This, typeof method>
  ) {
    const propertyKey = String(context.name);

    context.addInitializer(function (this: This) {

      const jobs = jobsMetadata.get(this) || {};



      jobs[propertyKey] = defineJob({
        ...options,
        type: 'event',
        resolve: this[propertyKey].bind(this)
      })

      jobsMetadata.set(this, jobs);
    });

    return method;
  }
}


export function getServiceJobs(target: any): {
  [key: string]: JobDefinition
} {
  const instance = getInstance(target);

  if (!serviceMetadata.has(instance.constructor)) {
    throw new Error('You must pass a class decorated with @Jobs to getServiceJobs');
  }

  const instanceMetadata = serviceMetadata.get(instance.constructor)
  if (instanceMetadata._serviceType !== 'jobs') {
    throw new Error('You must pass a class decorated with @Jobs to getServiceJobs');
  }

  const jobsMap = jobsMetadata.get(instance) || {};

  return jobsMap;
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