import {OrionApolloClientOpts} from '..'

export default function isSsrMode(options: OrionApolloClientOpts) {
  return options.ssrMode ? options.ssrMode : typeof window === 'undefined'
}
