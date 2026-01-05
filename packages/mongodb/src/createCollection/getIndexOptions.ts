import type {CreateIndexesOptions} from 'mongodb'
import type {CollectionIndex} from '../types'

/**
 * Extracts the index options from a CollectionIndex definition.
 * Handles both the new flat format and the deprecated nested options format.
 *
 * @example New format (recommended):
 * ```ts
 * { keys: { email: 1 }, unique: true, sparse: true }
 * // Returns: { unique: true, sparse: true }
 * ```
 *
 * @example Old format (deprecated):
 * ```ts
 * { keys: { email: 1 }, options: { unique: true } }
 * // Returns: { unique: true }
 * ```
 *
 * @param indexDef - The index definition from the collection configuration
 * @returns The MongoDB CreateIndexesOptions to pass to createIndex()
 */
export function getIndexOptions(indexDef: CollectionIndex): CreateIndexesOptions | undefined {
  // Extract all properties except 'keys' and 'options' as flat options
  const {keys: _keys, options: deprecatedOptions, ...flatOptions} = indexDef

  // If deprecated options exist, merge them with flat options (flat takes precedence)
  if (deprecatedOptions) {
    return {...deprecatedOptions, ...flatOptions}
  }

  // Return flat options if any exist, otherwise undefined
  return Object.keys(flatOptions).length > 0 ? flatOptions : undefined
}

/**
 * Gets the custom name from an index definition if one was specified.
 * Handles both flat format and deprecated nested options format.
 *
 * @param indexDef - The index definition from the collection configuration
 * @returns The custom index name if specified, undefined otherwise
 */
export function getIndexName(indexDef: CollectionIndex): string | undefined {
  // Flat format takes precedence
  if (indexDef.name) {
    return indexDef.name
  }

  // Fall back to deprecated options
  return indexDef.options?.name
}
