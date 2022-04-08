import {generateKeys} from '../crypto'
import {getVariables} from './getVariables'

describe('Environment', () => {
  beforeEach(() => {
    ;(global as any).__orion_env_final__ = undefined
    jest.resetModules()
  })

  it('should define all environment variables', async () => {
    const secretKey = 'QShwQT1+d5wk/F6FVpT5VmZFXm50aFRt9/LaDbwSEGo='
    const secretValue = 'this_is_secret'
    const data = {
      version: '1.0',
      publicKey: 'quyw/56O1P/BmjlHGfguZD27zKbjOtxNBDOTz+FOYho=',
      cleanKeys: {
        a_key: 'a_value'
      },
      encryptedKeys: {
        secret1:
          'nQCxsZxjVkOABeQSdIhYK7jSMYKUggUm9IWUGLpY3i4=:9gvH5IOhV/q5R4ngUIk2onf5oEZM5dIU89PRZ5TGjnnfcnrwkssLqsACNDmr0m4jQZVo0nBL'
      }
    }

    process.env.ORION_ENV_SECRET_KEY = secretKey
    const env = getVariables(data, secretKey)

    expect(env).toEqual({
      a_key: 'a_value',
      secret1: secretValue
    })
  })

  it('should thow an error when the secret key is not the one used to encrypt', () => {
    const data = {
      version: '1.0',
      publicKey: 'quyw/56O1P/BmjlHGfguZD27zKbjOtxNBDOTz+FOYho=',
      cleanKeys: {},
      encryptedKeys: {
        secret1:
          'nQCxsZxjVkOABeQSdIhYK7jSMYKUggUm9IWUGLpY3i4=:9gvH5IOhV/q5R4ngUIk2onf5oEZM5dIU89PRZ5TGjnnfcnrwkssLqsACNDmr0m4jQZVo0nBL'
      }
    }

    try {
      const key = generateKeys().decryptKey
      getVariables(data, key)
    } catch (error) {
      expect(error.message).toEqual(
        'Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not the right key for "secret1"'
      )
    }
    expect.assertions(1)
  })
})
