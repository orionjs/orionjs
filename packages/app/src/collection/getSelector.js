export default function(selector) {
  if (typeof selector === 'string') {
    selector = {_id: selector}
  }
  return selector
}
