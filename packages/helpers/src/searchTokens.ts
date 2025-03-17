import {normalizeForSearchToken} from './normalize'

/**
 * Generates an array of search tokens from input text and optional metadata.
 *
 * This function processes text by:
 * 1. Converting it to an array of strings (if not already)
 * 2. Filtering out falsy values
 * 3. Normalizing each string (removing accents, special characters)
 * 4. Splitting by spaces to create individual tokens
 * 5. Optionally adding metadata tokens in the format "_key:value"
 *
 * @param text - String or array of strings to tokenize
 * @param meta - Optional metadata object where each key-value pair becomes a token
 * @returns Array of normalized search tokens
 *
 * @example
 * // Returns ['hello', 'world']
 * getSearchTokens('Hello, World!')
 *
 * @example
 * // Returns ['hello', 'world', '_id:123']
 * getSearchTokens('Hello, World!', { id: '123' })
 */
export function getSearchTokens(text: string[] | string, meta?: Record<string, string>) {
  const stringArray = Array.isArray(text) ? text : [text]
  const tokens = stringArray
    .filter(Boolean)
    .map(text => String(text))
    .flatMap(word => {
      return normalizeForSearchToken(word).split(' ').filter(Boolean)
    })

  if (meta) {
    for (const key in meta) {
      tokens.push(`_${key}:${meta[key]}`)
    }
  }

  return tokens
}

/**
 * Interface for parameters used in generating search queries from tokens.
 *
 * @property filter - Optional string to filter search results
 * @property [key: string] - Additional key-value pairs for metadata filtering
 */
export interface SearchQueryForTokensParams {
  filter?: string
  [key: string]: string
}

/**
 * Options for customizing the search query generation behavior.
 * Currently empty but provided for future extensibility.
 */
export type SearchQueryForTokensOptions = {}

/**
 * Generates a MongoDB-compatible query object based on the provided parameters.
 *
 * This function:
 * 1. Processes any filter text into RegExp tokens for prefix matching
 * 2. Adds metadata filters based on additional properties in the params object
 * 3. Returns a query object with the $all operator for MongoDB queries
 *
 * @param params - Parameters for generating the search query
 * @param _options - Options for customizing search behavior (reserved for future use)
 * @returns A MongoDB-compatible query object with format { $all: [...tokens] }
 *
 * @example
 * // Returns { $all: [/^hello/, /^world/] }
 * getSearchQueryForTokens({ filter: 'Hello World' })
 *
 * @example
 * // Returns { $all: [/^search/, '_category:books'] }
 * getSearchQueryForTokens({ filter: 'search', category: 'books' })
 */
export function getSearchQueryForTokens(
  params: SearchQueryForTokensParams = {},
  _options: SearchQueryForTokensOptions = {},
) {
  const searchTokens: (string | RegExp)[] = []

  if (params.filter) {
    const filterTokens = getSearchTokens(params.filter).map(token => new RegExp(`^${token}`))
    searchTokens.push(...filterTokens)
  }

  for (const key in params) {
    if (key === 'filter') continue
    if (!params[key]) continue
    searchTokens.push(`_${key}:${params[key]}`)
  }

  return {$all: searchTokens}
}
