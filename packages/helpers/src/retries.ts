/**
 * Executes an asynchronous function with automatic retries on failure.
 * 
 * This utility attempts to execute the provided function and automatically
 * retries if it fails, with a specified delay between attempts. It will
 * continue retrying until either the function succeeds or the maximum
 * number of retries is reached.
 * 
 * @template TFunc Type of the function to execute (must return a Promise)
 * @param fn - The asynchronous function to execute
 * @param retries - The maximum number of retry attempts after the initial attempt
 * @param timeout - The delay in milliseconds between retry attempts
 * @returns A promise that resolves with the result of the function or rejects with the last error
 * 
 * @example
 * // Retry an API call up to 3 times with 1 second between attempts
 * const result = await executeWithRetries(
 *   () => fetchDataFromApi(),
 *   3,
 *   1000
 * );
 */
export function executeWithRetries<TFunc extends () => Promise<any>>(
  fn: TFunc,
  retries: number,
  timeout: number
): Promise<ReturnType<TFunc>> {
  return new Promise((resolve, reject) => {
    const retry = async (retries: number) => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        if (retries > 0) {
          setTimeout(() => retry(retries - 1), timeout)
        } else {
          reject(error)
        }
      }
    }
    retry(retries)
  })
}
