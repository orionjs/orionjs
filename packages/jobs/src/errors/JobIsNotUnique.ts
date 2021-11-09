export class JobIsNotUniqueError extends Error {
  constructor(uniquenessKey: string) {
    super(`Job with uniqueness key "${uniquenessKey}" already exists.`)
  }
}
