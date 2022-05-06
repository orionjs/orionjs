---
id: jobs
title: Jobs
sidebar_label: Jobs
sidebar_position: 3
---

`Jobs` are pre-programmed background processes that can be scheduled to run after a certain period of time.

# Install package

```bash npm2yarn
npm install @orion-js/dogs @orion-js/logger
```

## Proposed structure

```
app
└── jobs
    ├── job1
    │   └── index.ts
    ├── job2
    │   └── index.ts
    └── index.ts
```

## Start jobs

To start the jobs, we must use the `startWorkers` function:

- `jobs`: Object map of the jobs that this workers will execute.
- `workersCount?`: Number of workers to start. **Default is 4**.
- `lockTime?`: Time in milliseconds to lock a job for execution. **Default is 30000 (30 seconds)**. If a job is locked for longer than this time, it will be considered as failed. This is to prevent a job from being executed multiple times at the same time. You can extend this time inside a job by calling extendLockTime from context.
- `pollInterval?`: Time in milliseconds to wait between each look without results for a job to run at the database. **Default is 3000**.
- `cooldownPeriod?`: Time in milliseconds to wait too look for a job after a job execution. **Default is 100**.

### Example

```ts title="app/jobs/index.ts"
import {startWorkers} from '@orion-js/dogs'
import jobs from 'app/components/jobs'

startWorkers({
  jobs,
  workersCount: 5
})
```

## Define a Job

To define a job, use `defineJob` function from the package `@orion-js/dogs`.

- `type`: Type of the job: `event`|`recurrent`
- `resolve`: Async function to execute when the job is executed.
- `priority?`: The priority of the job. Higher is more priority. **Default is 1**.
- `runEvery?`: Run every x milliseconds. _This will be ignored if getNextRun is defined._
- `getNextRun?`: A function executed after each execution that returns the date of the next run..
- `onError?`: Called if the job fails.
- `onStale?`: Called if the job locktime is expired. The job will be executed again..
- `saveExecutionsFor?`: Save the executions of the job time in milliseconds. **Default is 1 week**. Set to 0 to disable.

## Types of jobs

All jobs have cluster support (run only once on any server) and the execution of the jobs may not be in the same server from which it was called.

There are two types of jobs: `event` & `recurrent`.

### Event jobs

To use event job, we first define it and then call it.

#### Define event job

```ts title="myEventJob.ts"
import {defineJob} from '@orion-js/dogs'

export default defineJob({
  type: 'event',
  async resolve(params) {
    // execute something
  }
})
```

#### Call event job

To call a job, the `scheduleJob` function must be imported, this function uses the following parameters:

- `name`: String name job.
- `uniqueIdentifier?`: Unique identifier.
- `params?`: Additional parameters passed to the job function.

##### Example calling the previously defined myEventJob

```ts
import {scheduleJob} from '@orion-js/dogs'

scheduleJob({
  name: 'myEventJob'
})
  .then()
  .catch()
```

##### Example using uniqueIdentifier & params

```ts
import {scheduleJob} from '@orion-js/dogs'

scheduleJob({
  name: 'makeZoneRequest',
  uniqueIdentifier: 'makeZoneRequest-CL',
  params: {zoneId: zone._id}
})
  .then()
  .catch()
```

### Recurrent jobs

The recurring jobs will be executed again at the defined time and once the current one has finished, if it is running (if the time has passed, it will run again).

```ts
import {defineJob} from '@orion-js/dogs'

export default job({
  type: 'recurrent',
  runEvery: 1000, // runs every 1000 ms
  async resolve(params) {
    // execute something
  }
})
```

This jobs will be called automatically. You can only specify `runEvery` or `getNextRun` in a job.
