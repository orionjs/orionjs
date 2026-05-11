/**
 * Executes an asynchronous function with automatic retries on failure.
 *
 * This utility attempts to execute the provided function and automatically
 * retries if it fails, with a specified delay between attempts. It will
 * continue retrying until either the function succeeds or the maximum
 * number of retries is reached.
 *
 * @param {() => Promise<any>} fn - The asynchronous function to execute
 * @param {number} retries - The maximum number of retry attempts after the initial attempt
 * @param {number} timeout - The delay in milliseconds between retry attempts
 * @returns {Promise<any>} A promise that resolves with the result of the function or rejects with the last error
 *
 * @example
 * // Retry an API call up to 3 times with 1 second between attempts
 * const result = await executeWithRetries(
 *   () => fetchDataFromApi(),
 *   3,
 *   1000
 * )
 */
export default function executeWithRetries(fn, retries, timeout) {
  return new Promise((resolve, reject) => {
    const retry = async remaining => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        if (remaining > 0) {
          setTimeout(() => retry(remaining - 1), timeout)
        } else {
          reject(error)
        }
      }
    }
    retry(retries)
  })
}
