import { Box, CircularProgress, IconButton, Modal, Tooltip } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import OpenInFullIcon from "@mui/icons-material/OpenInFull"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import ZoomInIcon from "@mui/icons-material/ZoomIn"
import ZoomOutIcon from "@mui/icons-material/ZoomOut"
import { useEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent, WheelEvent } from "react"
import type { DetectBox } from "./api/segment"

type MediaType = "image" | "video"

type MediaItem = {
    url: string
    type: MediaType
}

type MediaFocus = {
    aspectRatio?: number
    objectPosition: string
    detecting: boolean
}

type ExpandedMedia = MediaItem

type PanPoint = {
    x: number
    y: number
}

type DragState = {
    pointerId: number
    startX: number
    startY: number
    pan: PanPoint
}

type PinchState = {
    distance: number
    center: PanPoint
    zoom: number
    pan: PanPoint
}

type ReportMediaGalleryProps = {
    files: string[]
}

const focusCache = new Map<string, MediaFocus>()

const videoExtensions = new Set(["mp4", "mov", "m4v", "webm", "ogg"])
const minZoom = 1
const maxZoom = 5
const zoomStep = 0.35

const extensionFor = (url: string) => {
    const clean = url.split("?")[0].split("#")[0]
    return clean.split(".").pop()?.toLowerCase() || ""
}

const mediaTypeFor = (url: string): MediaType => {
    return videoExtensions.has(extensionFor(url)) ? "video" : "image"
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const pointDistance = (first: PanPoint, second: PanPoint) => {
    return Math.hypot(first.x - second.x, first.y - second.y)
}

const pointCenter = (first: PanPoint, second: PanPoint) => {
    return {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
    }
}

const tileAspectRatio = (ratio?: number) => {
    if (!ratio || !Number.isFinite(ratio)) {
        return "4 / 3"
    }
    if (ratio >= 1.45) {
        return "16 / 9"
    }
    if (ratio <= 0.82) {
        return "4 / 5"
    }
    return "1 / 1"
}

const tileHeight = (mediaCount: number, isLargeFirst: boolean, type: MediaType) => {
    if (type === "video") {
        return { xs: 220, md: 320 }
    }
    if (mediaCount === 1) {
        return { xs: 220, md: 340 }
    }
    if (mediaCount === 2) {
        return { xs: 190, md: 260 }
    }
    return { xs: 170, md: isLargeFirst ? 292 : 142 }
}

const fileNameFor = (url: string, index: number) => {
    const clean = url.split("?")[0].split("#")[0]
    const name = clean.split("/").pop()
    return name || `report-photo-${index}.jpg`
}

const imageDimensions = (url: string) => new Promise<{ width: number, height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
        resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
        })
    }
    image.onerror = reject
    image.src = url
})

const bestDetectionCenter = (detections: DetectBox[], width: number, height: number) => {
    const best = detections.find(detection => detection.plate) || detections[0]
    if (!best) {
        return undefined
    }

    const [x, y, w, h] = best.scaled
    const plateBox = best.plate?.box
    const centerX = plateBox
        ? x + plateBox[0] + (plateBox[2] / 2)
        : x + (w / 2)
    const centerY = plateBox
        ? y + plateBox[1] + (plateBox[3] / 2)
        : y + (h / 2)

    return {
        x: clamp((centerX / width) * 100, 8, 92),
        y: clamp((centerY / height) * 100, 8, 92),
    }
}

const detectFocus = async (url: string, index: number): Promise<MediaFocus> => {
    const dimensions = await imageDimensions(url)
    const aspectRatio = dimensions.width / dimensions.height
    const baseFocus: MediaFocus = {
        aspectRatio,
        objectPosition: "50% 50%",
        detecting: true,
    }

    try {
        const blob = await fetch(url).then(response => response.blob())
        const file = new File([blob], fileNameFor(url, index), {
            type: blob.type || "image/jpeg",
        })
        const { segment } = await import("./api/segment")
        const detections = await segment(file)
        const center = bestDetectionCenter(detections, dimensions.width, dimensions.height)
        if (!center) {
            return {
                ...baseFocus,
                detecting: false,
            }
        }
        return {
            aspectRatio,
            objectPosition: `${center.x}% ${center.y}%`,
            detecting: false,
        }
    } catch (error) {
        console.log(error)
        return {
            ...baseFocus,
            detecting: false,
        }
    }
}

export const ReportMediaGallery = ({ files }: ReportMediaGalleryProps) => {
    const media = useMemo(() => {
        const all = files.map((url) => ({
            url,
            type: mediaTypeFor(url),
        }))
        const video = all.find(item => item.type === "video")
        if (video) {
            return [video]
        }
        return all.filter(item => item.type === "image").slice(0, 3)
    }, [files])

    const [focusByUrl, setFocusByUrl] = useState<Record<string, MediaFocus>>({})
    const [expanded, setExpanded] = useState<ExpandedMedia>()
    const [zoom, setZoom] = useState(minZoom)
    const [pan, setPan] = useState<PanPoint>({ x: 0, y: 0 })
    const [isPanning, setIsPanning] = useState(false)
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const expandedImageRef = useRef<HTMLImageElement | null>(null)
    const dragRef = useRef<DragState | null>(null)
    const activePointersRef = useRef<Map<number, PanPoint>>(new Map())
    const pinchRef = useRef<PinchState | null>(null)

    const clampPanFor = (nextPan: PanPoint, nextZoom: number) => {
        const viewport = viewportRef.current
        const image = expandedImageRef.current
        if (!viewport || !image || nextZoom <= minZoom) {
            return { x: 0, y: 0 }
        }

        const viewportRect = viewport.getBoundingClientRect()
        const maxX = Math.max(0, ((image.clientWidth * nextZoom) - viewportRect.width) / 2)
        const maxY = Math.max(0, ((image.clientHeight * nextZoom) - viewportRect.height) / 2)

        return {
            x: clamp(nextPan.x, -maxX, maxX),
            y: clamp(nextPan.y, -maxY, maxY),
        }
    }

    const setZoomLevel = (nextZoom: number) => {
        const clampedZoom = clamp(nextZoom, minZoom, maxZoom)
        setZoom(clampedZoom)
        setPan(prev => clampPanFor(prev, clampedZoom))
    }

    const zoomBy = (amount: number) => {
        setZoom(currentZoom => {
            const nextZoom = clamp(currentZoom + amount, minZoom, maxZoom)
            setPan(prev => clampPanFor(prev, nextZoom))
            return nextZoom
        })
    }

    const resetExpandedImage = () => {
        setZoom(minZoom)
        setPan({ x: 0, y: 0 })
        setIsPanning(false)
        dragRef.current = null
        pinchRef.current = null
        activePointersRef.current.clear()
    }

    const handleExpandedWheel = (event: WheelEvent<HTMLDivElement>) => {
        event.preventDefault()
        zoomBy(event.deltaY > 0 ? -zoomStep : zoomStep)
    }

    const handleExpandedPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        activePointersRef.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        })
        event.currentTarget.setPointerCapture(event.pointerId)

        const pointers = Array.from(activePointersRef.current.values())
        if (pointers.length >= 2) {
            const center = pointCenter(pointers[0], pointers[1])
            pinchRef.current = {
                distance: pointDistance(pointers[0], pointers[1]),
                center,
                zoom,
                pan,
            }
            dragRef.current = null
            setIsPanning(true)
            return
        }

        if (zoom <= minZoom) {
            return
        }
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            pan,
        }
        setIsPanning(true)
    }

    const handleExpandedPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (activePointersRef.current.has(event.pointerId)) {
            activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            })
        }

        const pointers = Array.from(activePointersRef.current.values())
        const pinch = pinchRef.current
        if (pinch && pointers.length >= 2 && pinch.distance > 0) {
            event.preventDefault()
            const center = pointCenter(pointers[0], pointers[1])
            const nextZoom = clamp(pinch.zoom * (pointDistance(pointers[0], pointers[1]) / pinch.distance), minZoom, maxZoom)
            setZoom(nextZoom)
            setPan(clampPanFor({
                x: pinch.pan.x + center.x - pinch.center.x,
                y: pinch.pan.y + center.y - pinch.center.y,
            }, nextZoom))
            return
        }

        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) {
            return
        }

        event.preventDefault()
        const nextPan = {
            x: drag.pan.x + event.clientX - drag.startX,
            y: drag.pan.y + event.clientY - drag.startY,
        }
        setPan(clampPanFor(nextPan, zoom))
    }

    const endExpandedPan = (event: PointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        activePointersRef.current.delete(event.pointerId)
        if (activePointersRef.current.size < 2) {
            pinchRef.current = null
        }
        dragRef.current = null
        setIsPanning(false)
    }

    useEffect(() => {
        let cancelled = false
        media.forEach((item, index) => {
            if (item.type !== "image") {
                return
            }
            const cached = focusCache.get(item.url)
            if (cached) {
                setFocusByUrl(prev => ({ ...prev, [item.url]: cached }))
                return
            }
            setFocusByUrl(prev => ({
                ...prev,
                [item.url]: prev[item.url] || {
                    objectPosition: "50% 50%",
                    detecting: true,
                },
            }))
            detectFocus(item.url, index).then((focus) => {
                if (cancelled) {
                    return
                }
                focusCache.set(item.url, focus)
                setFocusByUrl(prev => ({ ...prev, [item.url]: focus }))
            })
        })
        return () => {
            cancelled = true
        }
    }, [media])

    useEffect(() => {
        resetExpandedImage()
    }, [expanded?.url])

    if (media.length === 0) {
        return null
    }

    return <>
        <Box sx={{
            display: "grid",
            gridTemplateColumns: {
                xs: media.length > 1 ? `repeat(${media.length}, minmax(180px, 1fr))` : "1fr",
                md: media.length === 3 ? "2fr 1fr" : `repeat(${media.length}, minmax(0, 1fr))`,
            },
            gridAutoRows: { xs: "auto", md: media.length === 3 ? 142 : "auto" },
            gap: 0.75,
            px: 2,
            maxHeight: { xs: 220, md: 340 },
            overflowX: { xs: media.length > 1 ? "auto" : "hidden", md: "hidden" },
            overflowY: "hidden",
        }}>
            {media.map((item, index) => {
                const focus = focusByUrl[item.url]
                const isLargeFirst = media.length === 3 && index === 0
                return <Box
                    key={item.url}
                    onClick={() => {
                        if (item.type === "image") {
                            setExpanded(item)
                        }
                    }}
                    sx={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 1,
                        bgcolor: "#0f172a",
                        height: tileHeight(media.length, isLargeFirst, item.type),
                        minHeight: 0,
                        maxHeight: tileHeight(media.length, isLargeFirst, item.type),
                        aspectRatio: item.type === "video"
                            ? "16 / 9"
                            : { xs: tileAspectRatio(focus?.aspectRatio), md: isLargeFirst ? "4 / 3" : tileAspectRatio(focus?.aspectRatio) },
                        gridRow: { md: isLargeFirst ? "span 2" : "span 1" },
                        cursor: item.type === "image" ? "zoom-in" : "default",
                        "&:hover .expand-control": {
                            opacity: 1,
                            transform: "translateY(0)",
                        },
                        "&:hover img": {
                            transform: "scale(1.03)",
                        },
                    }}
                >
                    {item.type === "video" ? <Box
                        component="video"
                        src={item.url}
                        controls
                        sx={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            objectFit: "contain",
                            bgcolor: "#000",
                        }}
                    /> : <Box
                        component="img"
                        src={item.url}
                        alt={`Report media ${index + 1}`}
                        sx={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            objectFit: "cover",
                            objectPosition: focus?.objectPosition || "50% 50%",
                            transition: "transform 160ms ease, object-position 180ms ease",
                        }}
                    />}
                    {item.type === "image" && <Tooltip title="Open full size">
                        <IconButton
                            className="expand-control"
                            size="small"
                            onClick={(event) => {
                                event.stopPropagation()
                                setExpanded(item)
                            }}
                            sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                opacity: 0,
                                transform: "translateY(-4px)",
                                transition: "opacity 140ms ease, transform 140ms ease",
                                color: "#ffffff",
                                bgcolor: "rgba(15, 23, 42, 0.72)",
                                "&:hover": {
                                    bgcolor: "rgba(15, 23, 42, 0.88)",
                                },
                            }}
                        >
                            <OpenInFullIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>}
                    {item.type === "image" && focus?.detecting && <CircularProgress
                        size={22}
                        thickness={5}
                        sx={{
                            position: "absolute",
                            left: 10,
                            bottom: 10,
                            color: "#ffffff",
                        }}
                    />}
                </Box>
            })}
        </Box>
        <Modal open={expanded != undefined} onClose={() => setExpanded(undefined)}>
            <Box sx={{
                position: "fixed",
                inset: { xs: 8, md: 24 },
                bgcolor: "rgba(2, 6, 23, 0.96)",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: { xs: 1, md: 2 },
                outline: "none",
            }}>
                {expanded?.type === "image" && <Box
                    sx={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        zIndex: 2,
                        display: "flex",
                        gap: 0.75,
                        p: 0.5,
                        borderRadius: 1,
                        bgcolor: "rgba(15, 23, 42, 0.74)",
                        backdropFilter: "blur(8px)",
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <Tooltip title="Zoom out">
                        <span>
                            <IconButton
                                aria-label="Zoom out"
                                size="small"
                                disabled={zoom <= minZoom}
                                onClick={() => zoomBy(-zoomStep)}
                                sx={{
                                    color: "#ffffff",
                                    "&.Mui-disabled": {
                                        color: "rgba(255,255,255,0.34)",
                                    },
                                }}
                            >
                                <ZoomOutIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Reset">
                        <span>
                            <IconButton
                                aria-label="Reset image"
                                size="small"
                                disabled={zoom === minZoom && pan.x === 0 && pan.y === 0}
                                onClick={resetExpandedImage}
                                sx={{
                                    color: "#ffffff",
                                    "&.Mui-disabled": {
                                        color: "rgba(255,255,255,0.34)",
                                    },
                                }}
                            >
                                <RestartAltIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Zoom in">
                        <span>
                            <IconButton
                                aria-label="Zoom in"
                                size="small"
                                disabled={zoom >= maxZoom}
                                onClick={() => zoomBy(zoomStep)}
                                sx={{
                                    color: "#ffffff",
                                    "&.Mui-disabled": {
                                        color: "rgba(255,255,255,0.34)",
                                    },
                                }}
                            >
                                <ZoomInIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>}
                <IconButton
                    aria-label="Close media"
                    onClick={() => setExpanded(undefined)}
                    sx={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        zIndex: 2,
                        color: "#ffffff",
                        bgcolor: "rgba(255,255,255,0.12)",
                        "&:hover": {
                            bgcolor: "rgba(255,255,255,0.2)",
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>
                {expanded?.type === "video" ? <Box
                    component="video"
                    src={expanded.url}
                    controls
                    autoPlay
                    sx={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                    }}
                /> : <Box
                    ref={viewportRef}
                    onWheel={handleExpandedWheel}
                    onDoubleClick={() => setZoomLevel(zoom > minZoom ? minZoom : 2.25)}
                    onPointerDown={handleExpandedPointerDown}
                    onPointerMove={handleExpandedPointerMove}
                    onPointerUp={endExpandedPan}
                    onPointerCancel={endExpandedPan}
                    sx={{
                        width: "100%",
                        height: "100%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: zoom > minZoom ? isPanning ? "grabbing" : "grab" : "zoom-in",
                        touchAction: "none",
                    }}
                >
                    <Box
                        component="img"
                        ref={expandedImageRef}
                        src={expanded?.url}
                        alt="Expanded report media"
                        draggable={false}
                        onLoad={() => setPan(prev => clampPanFor(prev, zoom))}
                        sx={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            userSelect: "none",
                            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                            transformOrigin: "center center",
                            transition: isPanning ? "none" : "transform 120ms ease",
                        }}
                    />
                </Box>}
            </Box>
        </Modal>
    </>
}
