export type SamResult = {
    mask: Blob
    bbox: [number, number, number, number] | null
}

const getImageSize = (blob: Blob): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const image = new Image()
        image.onload = () => {
            resolve({ width: image.naturalWidth, height: image.naturalHeight })
            URL.revokeObjectURL(url)
        }
        image.onerror = (err) => {
            reject(err)
            URL.revokeObjectURL(url)
        }
        image.src = url
    })

const extractMaskBbox = async (
    maskBlob: Blob,
    sourceWidth: number,
    sourceHeight: number
): Promise<[number, number, number, number] | null> => {
    const maskUrl = URL.createObjectURL(maskBlob)
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = reject
        image.src = maskUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) {
        URL.revokeObjectURL(maskUrl)
        return null
    }
    ctx.drawImage(image, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    let minX = canvas.width
    let minY = canvas.height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4
            const alpha = data[i + 3]
            const luminance = data[i] + data[i + 1] + data[i + 2]
            if (alpha > 10 && luminance > 20) {
                if (x < minX) minX = x
                if (y < minY) minY = y
                if (x > maxX) maxX = x
                if (y > maxY) maxY = y
            }
        }
    }

    URL.revokeObjectURL(maskUrl)
    if (maxX < minX || maxY < minY) {
        return null
    }

    const sx = sourceWidth / canvas.width
    const sy = sourceHeight / canvas.height
    return [
        Math.max(0, Math.floor(minX * sx)),
        Math.max(0, Math.floor(minY * sy)),
        Math.min(sourceWidth, Math.ceil(maxX * sx)),
        Math.min(sourceHeight, Math.ceil(maxY * sy)),
    ]
}

export const runSamSegment = async (file: File): Promise<SamResult> => {
    const url = import.meta.env.VITE_HF_SAM_URL as string | undefined
    const token = import.meta.env.VITE_HF_TOKEN as string | undefined

    if (!url) {
        throw new Error("VITE_HF_SAM_URL is not set")
    }

    const headers: Record<string, string> = {
        "Content-Type": file.type || "application/octet-stream",
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: file,
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`SAM request failed (${response.status}): ${text || response.statusText}`)
    }

    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
        const payload = await response.json()
        throw new Error(`SAM returned JSON instead of mask: ${JSON.stringify(payload)}`)
    }

    const mask = await response.blob()
    const size = await getImageSize(file)
    const bbox = await extractMaskBbox(mask, size.width, size.height)
    return { mask, bbox }
}
