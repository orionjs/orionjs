import watchProject from './watchProject'
import watchModules from './watchModules'
import run from '../run'
import debounce from 'lodash/debounce'

const onChange = debounce(run, 100)

export default function () {
  watchProject(onChange)
  watchModules(onChange)
}
