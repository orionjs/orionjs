export default function (func) {
  let running = false
  return async (...args) => {
    if (running) return
    running = true
    const result = await func(...args)
    running = false
    return result
  }
}
