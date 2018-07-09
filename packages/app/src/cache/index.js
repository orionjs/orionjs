import set from './set'
import store from './store'
import get from './get'
import invalidate from './invalidate'

export default {
  set: set(store),
  get: get(store),
  invalidate: invalidate(store)
}
