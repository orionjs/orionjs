import {getInstance, Service} from '@orion-js/services'
import crypto from 'crypto'

@Service()
class Hash {
  /**
   * Creates a hash from a password
   * @param text The text to hash
   * @returns The hash
   */
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('base64')
  }

  /**
   * Checks if a password is correct
   * @param text The unencrypted text to check
   * @param hash The hash to check against
   * @returns If the password is correct
   */
  compare(text: string, hash: string): boolean {
    return this.hash(text) === hash
  }
}

export const hash = getInstance(Hash)
