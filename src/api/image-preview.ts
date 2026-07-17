import heic2any from 'heic2any'
import { isHeicFile } from './file-utils'

const convertedImages = new WeakMap<File, Promise<Blob>>()

export const getDisplayImageBlob = (file: File): Promise<Blob> => {
  if (!isHeicFile(file)) return Promise.resolve(file)
  const cached = convertedImages.get(file)
  if (cached) return cached

  const conversion = Promise.resolve(heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 1,
  })).then(result => Array.isArray(result) ? result[0] : result)
  convertedImages.set(file, conversion)
  conversion.catch(() => convertedImages.delete(file))
  return conversion
}
