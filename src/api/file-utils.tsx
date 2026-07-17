const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const fallbackHash = (file: File, buffer: ArrayBuffer) => {
  let hash = 0x811c9dc5
  const bytes = new Uint8Array(buffer)
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return [
    'fnv1a',
    file.name,
    file.size,
    file.lastModified,
    (hash >>> 0).toString(16).padStart(8, '0')
  ].join('_')
}

export const getFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    try {
      return bufferToHex(await subtle.digest('SHA-256', buffer))
    } catch (error) {
      console.log(error)
    }
  }
  return fallbackHash(file, buffer)
}

const IMAGE_REPORT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/heic',
  'image/heif',
  'image/webp',
])

const IMAGE_REPORT_EXTENSIONS = ['.jpg', '.jpeg', '.heic', '.heif', '.webp']
const VIDEO_REPORT_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm']

// Android Chrome routes media-only accept lists through a photo picker that can
// redact GPS EXIF. One non-media MIME keeps the document picker path available.
export const REPORT_FILE_ACCEPT = 'image/jpeg, image/heic, image/heif, image/webp, video/*, text/plain'
export const MAX_REPORT_IMAGES = 3
export const MAX_REPORT_VIDEOS = 1

export const isHeicFile = (file: File): boolean => {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
}

export const isImageReportFile = (file: File): boolean => {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return IMAGE_REPORT_MIME_TYPES.has(type) || IMAGE_REPORT_EXTENSIONS.some((extension) => name.endsWith(extension))
}

export const isVideoReportFile = (file: File): boolean => {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return type.startsWith('video/') || VIDEO_REPORT_EXTENSIONS.some((extension) => name.endsWith(extension))
}

export const isSupportedReportFile = (file: File): boolean => {
  return isImageReportFile(file) || isVideoReportFile(file)
}
