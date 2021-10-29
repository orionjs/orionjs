export class PropertyAlreadyExistsError extends Error {
  constructor(schemaName: string, propertyName: string) {
    super(`Schema with name "${schemaName}" already contains property "${propertyName}".`)
  }
}
