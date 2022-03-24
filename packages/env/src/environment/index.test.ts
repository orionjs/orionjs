import 'reflect-metadata'
import {asymmetric} from '@orion-js/crypto'

describe('Environment', () => {
  beforeEach(() => {
    jest.resetModules()
  })
  it('should define all environment variables', async () => {
    const secretKey = 'QShwQT1+d5wk/F6FVpT5VmZFXm50aFRt9/LaDbwSEGo='
    const secretValue = 'this_is_secret'
    global.__orion_env__ = {
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
    const {env} = require('./index')

    expect(env).toEqual({
      a_key: 'a_value',
      secret1: secretValue
    })
  })

  it('should thow an error when the secret key is not present', () => {
    global.__orion_env__ = {
      version: '1.0',
      publicKey: 'quyw/56O1P/BmjlHGfguZD27zKbjOtxNBDOTz+FOYho=',
      encryptedKeys: {
        secret1:
          'nQCxsZxjVkOABeQSdIhYK7jSMYKUggUm9IWUGLpY3i4=:9gvH5IOhV/q5R4ngUIk2onf5oEZM5dIU89PRZ5TGjnnfcnrwkssLqsACNDmr0m4jQZVo0nBL'
      }
    }

    try {
      process.env.ORION_ENV_SECRET_KEY = ''
      const {env} = require('./index')
      console.log(env)
    } catch (error) {
      expect(error.message).toEqual(
        'Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not defined'
      )
    }
    expect.assertions(1)
  })

  it('should thow an error when the secret key is not the one used to encrypt', () => {
    global.__orion_env__ = {
      version: '1.0',
      publicKey: 'quyw/56O1P/BmjlHGfguZD27zKbjOtxNBDOTz+FOYho=',
      encryptedKeys: {
        secret1:
          'nQCxsZxjVkOABeQSdIhYK7jSMYKUggUm9IWUGLpY3i4=:9gvH5IOhV/q5R4ngUIk2onf5oEZM5dIU89PRZ5TGjnnfcnrwkssLqsACNDmr0m4jQZVo0nBL'
      }
    }

    try {
      process.env.ORION_ENV_SECRET_KEY = asymmetric.generateKeys().decryptKey
      require('./index')
    } catch (error) {
      expect(error.message).toEqual(
        'Orion encrypted env was passed but process.env.ORION_ENV_SECRET_KEY is not the right key for "secret1"'
      )
    }
    expect.assertions(1)
  })
})
