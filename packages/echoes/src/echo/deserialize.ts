export default function (serializedJavascript: string): any {
  try {
    return eval('(' + serializedJavascript + ')')
  } catch (error) {
    throw new Error('Error deserializing echo message')
  }
}
