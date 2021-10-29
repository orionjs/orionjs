export class SchemaAlreadyExistsError extends Error {
  constructor(schemaName: string) {
    super(`Schema with name "${schemaName}" has already been registered.`)
  }
}
