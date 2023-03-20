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
