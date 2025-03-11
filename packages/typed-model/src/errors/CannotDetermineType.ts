export class CannotDetermineTypeError extends Error {
  constructor(propertyKey: string) {
    super(
      `Cannot determine type at @Prop() "${propertyKey}". type: is required for all props since Orion v4`,
    )
  }
}
