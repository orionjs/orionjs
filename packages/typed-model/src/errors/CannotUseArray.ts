export class CannotUseArrayError extends Error {
  constructor(schemaName: string, propertyKey: string) {
    super(
      `Cannot infer type from an Array TypeScript type at "${schemaName}.${propertyKey}" field. Make sure your property decorator defines a "type" option. For example: "@Prop({ type: [String | Number | ...] })"`,
    )
  }
}
