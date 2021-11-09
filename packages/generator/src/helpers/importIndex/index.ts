import fs from 'fs'
import addElementToEnd from '../addElementToEnd'
import addImport from '../addImport'

export default async function (path: string, name: string): Promise<void> {
  if (fs.existsSync(`${path}/index.js`)) {
    let content: string = fs.readFileSync(`${path}/index.js`).toString()
    content = addImport(content, `import ${name} from './${name}'`)
    content = addElementToEnd(content, name)
    fs.writeFileSync(`${path}/index.js`, content)
  }
}
