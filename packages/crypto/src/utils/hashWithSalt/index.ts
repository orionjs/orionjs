import {getInstance, Service} from '@orion-js/services'
import bcrypt from 'bcryptjs'

@Service()
class HashWithSalt {
  /**
   * Creates a hash from a password
   * @param password The password to hash
   * @returns The hash
   */
  hash(password: string, saltRounds: number = 10): string {
    return bcrypt.hashSync(password, saltRounds)
  }

  /**
   * Checks if a password is correct
   * @param password The unencrypted password to check
   * @param hash The hash to check against
   * @returns If the password is correct
   */
  compare(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash)
  }
}

export const hashWithSalt = getInstance(HashWithSalt)
