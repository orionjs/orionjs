/**
 * Removes diacritical marks (accents) from text without any other modifications.
 * This is the most basic normalization function that others build upon.
 *
 * @param text - The input string to process
 * @returns String with accents removed but otherwise unchanged
 */
export function removeAccentsOnly(text: string) {
  if (!text) return ''
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: Removes diacritical marks (accents)
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normalizes text by removing diacritical marks (accents) and trimming whitespace.
 * Builds on removeAccentsOnly and adds whitespace trimming.
 *
 * @param text - The input string to normalize
 * @returns Normalized string with accents removed and whitespace trimmed
 */
export function removeAccentsAndTrim(text: string) {
  if (!text) return ''
  return removeAccentsOnly(text).trim()
}

/**
 * Normalizes text for search purposes by:
 * - Removing diacritical marks (accents)
 * - Converting to lowercase
 * - Trimming whitespace
 *
 * Builds on removeAccentsAndTrim and adds lowercase conversion.
 * Useful for case-insensitive and accent-insensitive text searching.
 *
 * @param text - The input string to normalize for search
 * @returns Search-optimized string in lowercase with accents removed
 */
export function normalizeForSearch(text: string) {
  if (!text) return ''
  return removeAccentsAndTrim(text).toLowerCase()
}

/**
 * Normalizes text for search purposes by:
 * - Removing diacritical marks (accents)
 * - Converting to lowercase
 * - Trimming whitespace
 * - Removing all spaces
 *
 * Builds on normalizeForSearch and removes all whitespace.
 * Useful for compact search indexes or when spaces should be ignored in searches.
 *
 * @param text - The input string to normalize for compact search
 * @returns Compact search-optimized string with no spaces
 */
export function normalizeForCompactSearch(text: string) {
  if (!text) return ''
  return normalizeForSearch(text).replace(/\s/g, '')
}

/**
 * Normalizes text for search token processing by:
 * - Removing diacritical marks (accents)
 * - Converting to lowercase
 * - Trimming whitespace
 * - Replacing all non-alphanumeric characters with spaces
 *
 * Builds on normalizeForSearch and replaces non-alphanumeric characters with spaces.
 * Useful for tokenizing search terms where special characters should be treated as word separators.
 *
 * @param text - The input string to normalize for tokenized search
 * @returns Search token string with only alphanumeric characters and spaces
 */
export function normalizeForSearchToken(text: string) {
  if (!text) return ''
  return normalizeForSearch(text).replace(/[^0-9a-z]/gi, ' ')
}

/**
 * Normalizes a string specifically for use as a file key (e.g., in S3 or other storage systems).
 * Performs the following transformations:
 * - Removes accents/diacritical marks
 * - Replaces special characters with hyphens
 * - Ensures only alphanumeric characters, hyphens, periods, and underscores remain
 * - Replaces multiple consecutive hyphens with a single hyphen
 * - Removes leading/trailing hyphens
 *
 * @param text - The input string to normalize for file key usage
 * @returns A storage-safe string suitable for use as a file key
 */
export function normalizeForFileKey(text: string) {
  if (!text) return ''
  return (
    removeAccentsOnly(text)
      // Replace spaces and unwanted characters with hyphens
      .replace(/[^a-zA-Z0-9-._]/g, '-')
      // Replace multiple consecutive hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .trim()
      .replace(/^-+|-+$/g, '')
  )
}
