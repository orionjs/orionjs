export class CannotDetermineTypeError extends Error {
  constructor(schemaName: string, propertyKey: string) {
    super(
      `Cannot determine type at "${schemaName}.${propertyKey}". type: is required for all props since Orion v4`
    )
  }
}
