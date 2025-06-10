import {getSchemaFromAnyOrionForm, isSchemaLike} from '../models'
import {SchemaFieldType} from '../types/schema'

/**
 * Extracts field labels from a schema, creating a flat object with dot-notation keys
 * matching the validation error keys and their corresponding labels.
 */
export default function getFieldLabels(
  schema: SchemaFieldType,
  currentKey = '',
): Record<string, string> {
  schema = getSchemaFromAnyOrionForm(schema)

  const labels: Record<string, string> = {}

  if (!schema || typeof schema !== 'object') {
    return labels
  }

  for (const [fieldKey, fieldSchema] of Object.entries(schema)) {
    // Skip metadata fields
    if (fieldKey.startsWith('__')) {
      continue
    }

    const fullKey = currentKey ? `${currentKey}.${fieldKey}` : fieldKey
    const field = fieldSchema as any

    // Add the label for this field if it exists
    if (field?.label && typeof field.label === 'string') {
      labels[fullKey] = field.label
    }

    // Recursively handle nested schemas
    if (field?.type) {
      let typeToCheck = field.type

      // Handle array types [SomeType]
      if (Array.isArray(typeToCheck) && typeToCheck.length > 0) {
        typeToCheck = typeToCheck[0]
      }

      // If the type is a nested schema, recursively get its labels
      if (isSchemaLike(typeToCheck)) {
        const nestedLabels = getFieldLabels(typeToCheck, fullKey)
        Object.assign(labels, nestedLabels)
      }
    }
  }

  return labels
}
