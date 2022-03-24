import {asymmetric} from '@orion-js/crypto'
import YAML from 'yaml'
import writeFile from '../../helpers/writeFile'
import {Config} from '../add/getConfig'

export default async function envInit({envPath}) {
  if (!envPath) {
    envPath = '.env.local.yml'
  }

  const keypair = asymmetric.generateKeys()

  const envFile: Config = {
    version: '1.0',
    publicKey: keypair.encryptKey,
    cleanKeys: {},
    encryptedKeys: {}
  }

  const text = YAML.stringify(envFile)

  writeFile(envPath, text)

  console.log('')

  console.log(
    `Environment file created. You need to use the following key to decrypt the environment variables:`
  )

  console.log('')

  console.log(keypair.decryptKey)

  console.log('')
}
