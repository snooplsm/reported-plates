import React, { useEffect, useRef, useState } from 'react'
import type { DetectBox, PlateDetection } from './api/segment';
import Box from '@mui/material/Box';
import { ToggleButtonGroup, ToggleButton, Paper, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import PanToolIcon from '@mui/icons-material/PanTool';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import type { Mat, Rect } from "@techstark/opencv-js";
import FilterCenterFocusIcon from '@mui/icons-material/FilterCenterFocus';
import { isHeicFile } from './api/file-utils';
import { getDisplayImageBlob } from './api/image-preview';

type DetectProps = {
    file: File; // The title displayed on the card
    boxes?: DetectBox[],
    onPlate?: (plate: PlateDetection) => void,
    onCarWithPlate?:(result:DetectBox[], car: DetectBox) => void
};

enum CanvasOption {
    Pan = "Pan",
    Label = "Label",
    ZoomIn = "ZoomIn",
    ZoomOut = "ZoomOut"
}

type PointerPosition = { x: number; y: number }
type PinchState = {
    distance: number
    scale: number
    offsetX: number
    offsetY: number
    center: PointerPosition
}

const pointerDistance = (points: PointerPosition[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
const pointerCenter = (points: PointerPosition[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })

const DetectView= ({ file, boxes, onPlate, onCarWithPlate }:DetectProps) => {
    const isMobile = useMediaQuery('(max-width:900px)')

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [plate, setPlate] = useState<PlateDetection>()
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })

    const [scale, setScale] = useState<number>(1); // Track zoom level
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    const selectedOptionToCursor: Record<CanvasOption, [React.ReactElement, string]> = {
        [CanvasOption.Pan]: [<PanToolIcon />, "grab"],
        [CanvasOption.Label]: [<HighlightAltIcon />, "crosshair"],
        [CanvasOption.ZoomIn]: [<ZoomInIcon />, "zoom-in"],
        [CanvasOption.ZoomOut]: [<ZoomOutIcon />, "zoom-out"]
    }
    const [selectedOption, setSelectedOption] = useState<CanvasOption | null>(CanvasOption.Pan);
    const [cursor, setCursor] = useState<string>("grab")

    const handleToggle = (_event: React.MouseEvent<HTMLElement>, newOption: CanvasOption | null) => {
        console.log(newOption)
        if (newOption !== null) {
            setSelectedOption(newOption);
            const cursor = selectedOptionToCursor[newOption]
            const k = cursor[1]
            console.log("cursor", cursor)
            setCursor(k)
        }
    };

    const imgRef = useRef<HTMLImageElement | null>(null);
    const boxRef = useRef<HTMLElement | null>(null);
    const activePointersRef = useRef(new Map<number, PointerPosition>())
    const pinchRef = useRef<PinchState | null>(null)

    const [isDragging, setIsDragging] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [position, setPosition] = useState([0, 0, 0, 0]);
    const [boundingBox, setBoundingBox] = useState<[x1: number, y1: number, x2: number, y2: number]>()
    const clampOffsets = (nextScale: number, proposedOffsetX: number, proposedOffsetY: number) => {
        if (!boxRef.current || !imgRef.current || nextScale <= 1) {
            return { x: 0, y: 0 }
        }
        const container = boxRef.current.getBoundingClientRect();
        const baseWidth = imgRef.current.clientWidth;
        const baseHeight = imgRef.current.clientHeight;
        const scaledWidth = baseWidth * nextScale;
        const scaledHeight = baseHeight * nextScale;

        const minX = Math.min(0, container.width - scaledWidth);
        const minY = Math.min(0, container.height - scaledHeight);

        return {
            x: Math.max(minX, Math.min(0, proposedOffsetX)),
            y: Math.max(minY, Math.min(0, proposedOffsetY)),
        }
    }

    const getImagePoint = (clientX: number, clientY: number) => {
        const image = imgRef.current
        if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
            return null
        }
        const rect = image.getBoundingClientRect();
        const x = Math.max(0, Math.min(image.naturalWidth, (clientX - rect.left) * image.naturalWidth / rect.width));
        const y = Math.max(0, Math.min(image.naturalHeight, (clientY - rect.top) * image.naturalHeight / rect.height));
        return { x, y }
    }

    const zoomAtPoint = (clientX: number, clientY: number, zoomFactor: number) => {
        if (!boxRef.current) {
            return
        }
        const rect = boxRef.current.getBoundingClientRect()
        const cursorX = clientX - rect.left
        const cursorY = clientY - rect.top
        const newScale = Math.min(Math.max(scale * zoomFactor, 1), 8)
        if (newScale === scale) {
            return
        }

        const worldX = (cursorX - offsetX) / scale
        const worldY = (cursorY - offsetY) / scale
        const rawOffsetX = cursorX - worldX * newScale
        const rawOffsetY = cursorY - worldY * newScale
        const next = clampOffsets(newScale, rawOffsetX, rawOffsetY)
        setScale(newScale)
        setOffsetX(next.x)
        setOffsetY(next.y)
    }

    const onPointerDown = (e: React.PointerEvent) => {
        if(!imgRef.current) {
            return
        }
        if (e.pointerType === "mouse" && e.button !== 0) {
            return
        }
        activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const activePoints = [...activePointersRef.current.values()]
        if (selectedOption === CanvasOption.Pan && activePoints.length === 2) {
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            pinchRef.current = {
                distance: Math.max(1, pointerDistance(activePoints)),
                scale,
                offsetX,
                offsetY,
                center: pointerCenter(activePoints),
            }
            setIsPanning(false)
            return
        }
        if (isMobile && e.pointerType === "touch" && selectedOption === CanvasOption.Pan) {
            return
        }
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        if (selectedOption === CanvasOption.ZoomIn) {
            zoomAtPoint(e.clientX, e.clientY, 1.35)
            return
        }
        if (selectedOption === CanvasOption.ZoomOut) {
            zoomAtPoint(e.clientX, e.clientY, 1 / 1.35)
            return
        }
        if (selectedOption === CanvasOption.Label) {
            setIsDragging(true)
        }
        if (selectedOption === CanvasOption.Pan) {
            setIsPanning(true)
            setPosition([e.clientX, e.clientY, 0, 0])
            return
        }
        const point = getImagePoint(e.clientX, e.clientY)
        if (!point) {
            return
        }
        setPosition([point.x, point.y])
        if (selectedOption === CanvasOption.Label) {
            setBoundingBox([point.x, point.y, point.x, point.y])
        }
    }

    const onPointerEnd = (e: React.PointerEvent) => {
        activePointersRef.current.delete(e.pointerId)
        if (activePointersRef.current.size < 2) {
            pinchRef.current = null
        }
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
        }
        if (isDragging && boundingBox) {
            const image = imgRef.current
            if (image) {
                const left = Math.max(0, Math.floor(Math.min(boundingBox[0], boundingBox[2])))
                const top = Math.max(0, Math.floor(Math.min(boundingBox[1], boundingBox[3])))
                const right = Math.min(image.naturalWidth, Math.ceil(Math.max(boundingBox[0], boundingBox[2])))
                const bottom = Math.min(image.naturalHeight, Math.ceil(Math.max(boundingBox[1], boundingBox[3])))
                const width = right - left
                const height = bottom - top

                if (width >= 4 && height >= 4) {
                    void import("@techstark/opencv-js").then(({ default: cv }) => {
                        const mat = cv.imread(image)
                        return runPlateFromRect(mat, new cv.Rect(left, top, width, height))
                    })
                }
            }
            setSelectedOption(CanvasOption.Pan)
            setCursor("grab")
        }
        setIsDragging(false)
        setIsPanning(false)
    }

    const runPlateFromRect = async (mat: Mat, rectRoi: Rect) => {
        const [{ default: cv }, { detectPlate }] = await Promise.all([
            import("@techstark/opencv-js"),
            import('./api/segment'),
        ])
        const roi = mat.roi(rectRoi)
        cv.cvtColor(roi, roi, cv.COLOR_RGBA2RGB);
        mat.delete()
        const foundPlate = await detectPlate(roi)
        if (foundPlate) {
            setPlate(foundPlate)
            onPlate?.(foundPlate)
        }
        roi.delete()
    }

    const onPointerMove = (e: React.PointerEvent) => {
        if (activePointersRef.current.has(e.pointerId)) {
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        }
        const activePoints = [...activePointersRef.current.values()]
        if (selectedOption === CanvasOption.Pan && activePoints.length === 2 && pinchRef.current && boxRef.current) {
            e.preventDefault()
            const start = pinchRef.current
            const nextCenter = pointerCenter(activePoints)
            const nextScale = Math.min(Math.max(start.scale * pointerDistance(activePoints) / start.distance, 1), 8)
            const rect = boxRef.current.getBoundingClientRect()
            const startX = start.center.x - rect.left
            const startY = start.center.y - rect.top
            const worldX = (startX - start.offsetX) / start.scale
            const worldY = (startY - start.offsetY) / start.scale
            const rawX = nextCenter.x - rect.left - worldX * nextScale
            const rawY = nextCenter.y - rect.top - worldY * nextScale
            const next = clampOffsets(nextScale, rawX, rawY)
            setScale(nextScale)
            setOffsetX(next.x)
            setOffsetY(next.y)
            return
        }
        if (isMobile && e.pointerType === "touch" && activePoints.length < 2) {
            return
        }
        if (isDragging) {
            const point = getImagePoint(e.clientX, e.clientY)
            if (!point) {
                return
            }
            e.preventDefault()
            const { x, y } = point
            const box:[x1: number, y1: number, x2: number, y2: number] = [position[0], position[1], x, y]
            setBoundingBox(box)
        } else if (isPanning) {
            e.preventDefault()
            const dx = e.clientX - position[0];
            const dy = e.clientY - position[1];
            const next = clampOffsets(scale, offsetX + dx, offsetY + dy)
            setOffsetX(next.x);
            setOffsetY(next.y);
            setPosition([e.clientX, e.clientY, 0, 0])
        }
    }

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!boxRef.current) {
            return
        }
        const rect = boxRef.current.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const zoomFactor = Math.exp(-e.deltaY * 0.0015);
        const newScale = Math.min(Math.max(scale * zoomFactor, 1), 8);
        if (newScale === scale) {
            return
        }

        const worldX = (cursorX - offsetX) / scale;
        const worldY = (cursorY - offsetY) / scale;
        const rawOffsetX = cursorX - worldX * newScale;
        const rawOffsetY = cursorY - worldY * newScale;
        const next = clampOffsets(newScale, rawOffsetX, rawOffsetY)
        setScale(newScale);
        setOffsetX(next.x);
        setOffsetY(next.y);
    };

    useEffect(() => {
        let cancelled = false
        let localUrl = ''
        const fetchImage = async () => {
            let file2Use: string;

            if (isHeicFile(file)) {
                try {
                    const converted = await getDisplayImageBlob(file)
                    file2Use = URL.createObjectURL(converted);
                } catch (e) {
                    console.log(e);
                    return;
                }
            } else {
                file2Use = URL.createObjectURL(file);
            }
            localUrl = file2Use
            if (cancelled) {
                URL.revokeObjectURL(file2Use)
                return
            }
            setImageSrc(file2Use);
            // Always reset viewport when a new file is loaded so the full image is visible.
            setScale(1)
            setOffsetX(0)
            setOffsetY(0)
            setBoundingBox(undefined)
            setImageDimensions({ width: 0, height: 0 })
            setPlate(undefined)
            setIsDragging(false)
            setIsPanning(false)
            activePointersRef.current.clear()
            pinchRef.current = null
        };

        fetchImage();
        return () => {
            cancelled = true
            if (localUrl) URL.revokeObjectURL(localUrl)
        }
    }, [file]);

    useEffect(() => {
        const detect = boxes?.[0]?.plate || null;
        if (detect && !plate) {
            setPlate(detect);
        }
    }, [boxes, plate]);


    useEffect(() => {
        const container = boxRef.current;
        if (container) {
            container.addEventListener("wheel", handleWheel, { passive: false }); // Attach listener manually with passive: false
        }

        return () => {
            if (container) {
                container.removeEventListener("wheel", handleWheel);
            }
        };
    }, [boxRef.current, scale, offsetX, offsetY])

    if (file == null) {
        return null
    } else
        return (
            <Paper sx={{
                position: "relative",
                overflow: "hidden",
                margin: 1,
                width: "auto",
                height: "auto",
                minHeight: imageSrc ? 0 : 180,
            }}>
                <Box
                    ref={boxRef}
                    sx={{
                        position: "relative",
                        overflow: "hidden",
                        width: "auto",
                        touchAction: isMobile ? "pan-y" : (scale > 1 || selectedOption === CanvasOption.Label ? "none" : "pan-y"),
                        overscrollBehavior: isMobile ? "auto" : (scale > 1 ? "contain" : "auto"),
                    }}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerEnd}
                    onPointerCancel={onPointerEnd}
                    onPointerMove={onPointerMove}
                >
                    <Box
                        style={{
                            position: "relative",
                            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                            transformOrigin: "0 0",
                            willChange: "transform",
                        }}
                    >
                        {imageSrc && <img
                            ref={imgRef}
                            src={imageSrc}
                            onLoad={(event) => {
                                setImageDimensions({
                                    width: event.currentTarget.naturalWidth,
                                    height: event.currentTarget.naturalHeight,
                                })
                            }}
                            style={{
                                width: "100%",
                                height: "auto",
                                display: "block",
                                cursor: cursor,
                            }}
                        />}
                        {boundingBox && imageDimensions.width > 0 && imageDimensions.height > 0 && (() => {
                            const left = Math.min(boundingBox[0], boundingBox[2]) / imageDimensions.width * 100
                            const top = Math.min(boundingBox[1], boundingBox[3]) / imageDimensions.height * 100
                            const width = Math.abs(boundingBox[2] - boundingBox[0]) / imageDimensions.width * 100
                            const height = Math.abs(boundingBox[3] - boundingBox[1]) / imageDimensions.height * 100
                            return <Box sx={{
                                position: 'absolute',
                                zIndex: 3,
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                boxSizing: 'border-box',
                                border: '3px solid #16a34a',
                                bgcolor: 'rgba(22, 163, 74, 0.12)',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.9)',
                                pointerEvents: 'none',
                            }} />
                        })()}
                        {imageDimensions.width > 0 && imageDimensions.height > 0 && boxes
                            ?.filter(candidate => candidate.file === file && candidate.plate?.box)
                            .map((candidate, index) => {
                                const candidatePlate = candidate.plate!
                                const carBox = candidate.scaled || candidate.box
                                const plateBox = candidatePlate.sourceBox || candidatePlate.box
                                const left = (carBox[0] + plateBox[0]) / imageDimensions.width * 100
                                const top = (carBox[1] + plateBox[1]) / imageDimensions.height * 100
                                const width = plateBox[2] / imageDimensions.width * 100
                                const height = plateBox[3] / imageDimensions.height * 100
                                const selected = candidatePlate === plate
                                return <Box
                                    component="button"
                                    type="button"
                                    key={`${candidate.index}_${index}_${candidatePlate.text || 'plate'}`}
                                    aria-label={`Select plate ${candidatePlate.text || index + 1}`}
                                    aria-pressed={selected}
                                    onPointerDown={(event) => {
                                        if (event.pointerType === 'mouse') event.stopPropagation()
                                    }}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        setPlate(candidatePlate)
                                        onCarWithPlate?.(boxes, candidate)
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        zIndex: 4,
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        width: `${width}%`,
                                        height: `${height}%`,
                                        p: 0,
                                        border: selected ? '3px solid #16a34a' : '3px solid #f59e0b',
                                        bgcolor: selected ? 'rgba(22, 163, 74, 0.16)' : 'rgba(245, 158, 11, 0.12)',
                                        boxShadow: '0 0 0 1px rgba(255,255,255,0.9)',
                                        cursor: 'pointer',
                                        borderRadius: 0,
                                    }}
                                >
                                    <Box component="span" sx={{
                                        position: 'absolute',
                                        left: -3,
                                        bottom: '100%',
                                        px: 0.5,
                                        py: 0.15,
                                        bgcolor: selected ? '#16a34a' : '#f59e0b',
                                        color: selected ? '#fff' : '#111827',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        lineHeight: 1.3,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {candidatePlate.text || `Plate ${index + 1}`}
                                    </Box>
                                </Box>
                            })}
                    </Box>
                </Box>
                <Box sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                }}>
                <ToggleButtonGroup
                    value={selectedOption}
                    exclusive
                    onChange={handleToggle}
                    aria-label="Pan or Label"
                    sx={{
                        display: { xs: "none", md: "inline-flex" },
                        gap: "0.5rem",
                        background: "rgba(255,255,255,0.9)",
                        boxShadow: 2,
                    }}
                >
                    <ToggleButton key={CanvasOption.Pan} value={CanvasOption.Pan} aria-label="Pan">
                        {selectedOptionToCursor[CanvasOption.Pan]}
                    </ToggleButton>
                    <ToggleButton key={CanvasOption.Label} value={CanvasOption.Label} aria-label="Label">
                        {selectedOptionToCursor[CanvasOption.Label]}
                    </ToggleButton>
                    <ToggleButton key={CanvasOption.ZoomIn} value={CanvasOption.ZoomIn} aria-label="ZoomIn">
                        {selectedOptionToCursor[CanvasOption.ZoomIn]}
                    </ToggleButton>
                    <ToggleButton key={CanvasOption.ZoomOut} value={CanvasOption.ZoomOut} aria-label="ZoomOut">
                        {selectedOptionToCursor[CanvasOption.ZoomOut]}
                    </ToggleButton>
                </ToggleButtonGroup>
                <Tooltip title="Run plate detector on this image">
                    <IconButton aria-label="Detect license plate" onClick={async ()=> {
                        const { segment } = await import('./api/segment')
                        segment(file)
                        .then(result=> {
                            if (result) {
                                const carWithPlates = result.filter(res => res.plate != null)
                                if (carWithPlates && carWithPlates[0]) {
                                  const carWithPlate = carWithPlates[0]
                                  onCarWithPlate?.(result,carWithPlate)
                                }
                              }
                        }).catch(console.log)
                    }}>
                        <FilterCenterFocusIcon/>
                    </IconButton>
                </Tooltip>
                </Box>
            </Paper>
        )
}

export default DetectView
