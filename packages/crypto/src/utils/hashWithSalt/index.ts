import {getInstance, Service} from '@orion-js/services'
import bcrypt from 'bcryptjs'

const saltRounds = 12

@Service()
class HashWithSalt {
  /**
   * Creates a hash from a password
   * @param password The password to hash
   * @returns The hash
   */
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, saltRounds)
  }

  /**
   * Checks if a password is correct
   * @param password The unencrypted password to check
   * @param hash The hash to check against
   * @returns If the password is correct
   */
  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}

export const hashWithSalt = getInstance(HashWithSalt)
