import omit from 'lodash/omit'

export default function(result) {
  return omit(result, 'connection', 'result', 'message', 'toJSON', 'toString')
}
