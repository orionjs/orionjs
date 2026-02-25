import prompts from 'prompts'
import {Config} from '../../environment/getVariables'

export const getParams = async (config: Config, opts?: {key?: string; value?: string}) => {
  if (opts?.key && opts?.value) {
    return {key: opts.key, value: opts.value}
  }

  const response = await prompts([
    {
      type: 'text',
      name: 'key',
      message: 'Key',
    },
    {
      type: 'text',
      name: 'value',
      message: 'Value',
    },
  ])

  return {
    key: response.key as string,
    value: response.value as string,
  }
}
