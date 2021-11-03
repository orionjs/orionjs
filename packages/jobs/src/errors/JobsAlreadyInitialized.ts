export class JobsAlreadyInitializedError extends Error {
  constructor() {
    super(`Jobs were already initialized. Please call "init(...)" only once.`)
  }
}
