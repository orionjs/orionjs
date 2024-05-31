import {generateKeys} from '../crypto'
import {getDts} from './getDts'
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
      },
      readFromSecret: {
        SECRET_ENV: ['secret2'],
        SECRET2_ENV: ['secret3', 'secret4']
      }
    }
    process.env.SECRET_ENV = JSON.stringify({secret2: 'this_is_secret'})
    process.env.SECRET2_ENV = JSON.stringify({secret3: '3', secret4: '4'})
    process.env.ORION_ENV_SECRET_KEY = secretKey
    const env = getVariables(data, secretKey)

    expect(env).toEqual({
      a_key: 'a_value',
      secret1: secretValue,
      secret2: 'this_is_secret',
      secret3: '3',
      secret4: '4'
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

  it('should read the decyrpt key from the secret', () => {
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
      },
      readFromSecret: {
        SECRET_ENV: ['secret2']
      }
    }
    process.env.SECRET_ENV = JSON.stringify({
      secret2: 'this_is_secret',
      ORION_ENV_SECRET_KEY: secretKey
    })
    const env = getVariables(data, secretKey)

    expect(env).toEqual({
      a_key: 'a_value',
      secret1: secretValue,
      secret2: 'this_is_secret'
    })
  })

  it('should log an error when the secret is not a valid JSON, and related secrets undefined', () => {
    console.warn = jest.fn()
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
      },
      readFromSecret: {
        SECRET_ENV: ['secret2']
      }
    }
    process.env.SECRET_ENV = 'not a json'
    const env = getVariables(data, secretKey)

    expect(env).toEqual({
      a_key: 'a_value',
      secret1: secretValue,
      secret2: undefined
    })
    expect((console.warn as jest.Mock).mock.calls[0][0].includes('it is not a valid JSON')).toBe(
      true
    )
  })

  it('Dts should return the right types', () => {
    const dts = getDts({
      version: '1.0',
      publicKey: 'public',
      cleanKeys: {
        a_key: 'a_value'
      },
      encryptedKeys: {
        secret: 'encrypted'
      },
      readFromSecret: {
        SECRET_ENV: ['secret2', 'secret3']
      }
    })
    expect(dts).toEqual(`declare module '@orion-js/env' {
  export const env: {
    a_key: string
    secret: string
    secret2: string
    secret3: string
  }
}
`)
  })
})
