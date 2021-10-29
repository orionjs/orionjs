export class CannotDetermineTypeError extends Error {
  constructor(schemaName: string, propertyKey: string) {
    super(
      `Cannot determine type at "${schemaName}.${propertyKey}" field (object/union/ambiguous type was used). Make sure your property decorator defines a "type" option. For example: "@Prop({ type: {name: String, age: Number} })"`
    )
  }
}
