import prompts from 'prompts'
import {Config} from './getConfig'

export const getParams = async (config: Config) => {
  const response = await prompts([
    {
      type: 'text',
      name: 'key',
      message: 'Key'
    },
    {
      type: 'text',
      name: 'value',
      message: 'Value'
    }
  ])

  return {
    key: response.key as string,
    value: response.value as string
  }
}
