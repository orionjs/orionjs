export class JobsNotInitializedError extends Error {
  constructor() {
    super(`Called a jobs operation before initializing. Call @orion-js/jobs "init" first.`)
  }
}
