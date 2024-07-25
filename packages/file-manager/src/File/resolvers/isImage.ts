import {FileSchema} from '../schema'

export function isImage(image: FileSchema): boolean {
  if (!image.type) {
    return true
  }
  const mime = image.type
  return mime.includes('image')
}
