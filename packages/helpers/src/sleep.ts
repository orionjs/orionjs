/**
 * Creates a timeout with a promise
 */
export default (time: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, time))
}
