'use babel'
import addImport from '../../helpers/addImport'
import fs from 'fs-plus'

export default function({path, name}) {
  let content = fs.readFileSync(`${path}/index.js`).toString()
  content = addImport(content, `import ${name} from './${name}'`)
  content = content.replace('start({', `start({\n  ${name},`)
  fs.writeFileSync(`${path}/index.js`, content)
}
