export default function (serializedJavascript) {
  try {
    return eval('(' + serializedJavascript + ')')
  } catch (error) {
    throw new Error('Error deserializing echo message')
  }
}
