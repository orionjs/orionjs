import YAML from 'yaml'
import {generateKeys} from '../../crypto'
import {Config} from '../../environment/getVariables'
import {writeFile} from '../../files'

export default async function envInit({path}) {
  if (!path) {
    path = '.env.local.yml'
  }

  const keypair = generateKeys()

  const envFile: Config = {
    version: '1.0',
    publicKey: keypair.encryptKey,
    cleanKeys: {},
    encryptedKeys: {},
    readFromSecret: {},
  }

  const text = YAML.stringify(envFile)

  writeFile(path, text)

  console.log('')

  console.log(
    `Environment file created. You need to use the following key to decrypt the environment variables:`,
  )

  console.log('')

  console.log(keypair.decryptKey)

  console.log('')
}
