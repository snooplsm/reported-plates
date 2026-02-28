import React, { useEffect, useRef, useState } from 'react'
import { DetectBox, detectPlate, PlateDetection, segment } from './api/segment';
import Box from '@mui/material/Box';
import { ToggleButtonGroup, ToggleButton, Paper, IconButton, Tooltip } from '@mui/material';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import PanToolIcon from '@mui/icons-material/PanTool';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import cv from "@techstark/opencv-js";
import heic2any from "heic2any";
import FilterCenterFocusIcon from '@mui/icons-material/FilterCenterFocus';

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

const DetectView= ({ file, boxes, onPlate, onCarWithPlate }:DetectProps) => {

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [plate, setPlate] = useState<PlateDetection>()

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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const boxRef = useRef<HTMLElement | null>(null);

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

    const getCanvasPoint = (e: React.MouseEvent) => {
        if(!canvasRef.current) {
            return null
        }
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const x = Math.max(0, Math.min(canvasRef.current.width, (e.clientX - rect.left) * scaleX));
        const y = Math.max(0, Math.min(canvasRef.current.height, (e.clientY - rect.top) * scaleY));
        return { x, y }
    }

    const onMouseDown = (e: React.MouseEvent) => {
        if(!canvasRef.current) {
            return
        }
        if (e.button !== 0) {
            return
        }
        e.preventDefault()
        if (selectedOption === CanvasOption.Label) {
            setIsDragging(true)
        }
        if (selectedOption === CanvasOption.Pan) {
            setIsPanning(true)
            setPosition([e.clientX, e.clientY, 0, 0])
            return
        }
        const point = getCanvasPoint(e)
        if (!point) {
            return
        }
        setPosition([point.x, point.y])
        if (selectedOption === CanvasOption.Label) {
            setBoundingBox([point.x, point.y, point.x, point.y])
        }
    }

    useEffect(() => {
        console.log("position changed", position)
    }, [position])

    const onMouseUp = () => {
        if (isDragging && boundingBox) {
            if(!canvasRef.current) {
                return
            }
            if(!imgRef.current) {
                return
            }
            if(!imageSrc) {
                return
            }
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
            const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor
            const bbox = boundingBox
            const image = new Image()
            image.src = imageSrc
            image.onload = async () => {
                console.log(bbox)
                const mat = cv.imread(image)

                const width = mat.cols
                const height = mat.rows
                const scaleX2 = rect.width / width; // Horizontal scaling factor
                const scaleY2 = rect.height / height; // Vertical scaling factor
                const scaledBox = bbox.map((x, i) => {
                    const scale = (i % 2 === 0) ? scaleX : scaleY; // Determine scale based on index
                    return x / scale; // Apply scaling
                });
                const x1 = scaledBox[0] / scaleX2
                const y1 = scaledBox[1] / scaleY2
                const x2 = scaledBox[2] / scaleX2
                const y2 = scaledBox[3] / scaleY2
                console.log(x1, y1, x2, y2)
                const rectRoi = new cv.Rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
                await runPlateFromRect(mat, rectRoi)
            }
        }
        setIsDragging(false)
        setIsPanning(false)
    }

    const runPlateFromRect = async (mat: cv.Mat, rectRoi: cv.Rect) => {
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

    const onMouseMove = (e: React.MouseEvent) => {
        const point = getCanvasPoint(e)
        if (!point) {
            return
        }
        const { x, y } = point

        if (isDragging) {
            const box:[x1: number, y1: number, x2: number, y2: number] = [position[0], position[1], x, y]
            setBoundingBox(box)
        } else if (isPanning) {
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
        const fetchImage = async () => {
            let file2Use: string;

            if (file.type.toLowerCase() === "image/heic") {
                const uuu = URL.createObjectURL(file);
                try {
                    const blob: Blob = await (await fetch(uuu)).blob();
                    const converted = await heic2any({
                        blob,
                        toType: "image/jpeg",
                    }) as Blob;
                    file2Use = URL.createObjectURL(converted);
                } catch (e) {
                    console.log(e);
                    return;
                }
            } else {
                file2Use = URL.createObjectURL(file);
            }
            setImageSrc(file2Use);
        };

        fetchImage();
    }, [file]);

    useEffect(() => {
        const detect = boxes?.[0]?.plate || null;
        if (detect && plate !== detect) {
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

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (ctx == null) {
            return
        }
        if (canvas == null) {
            return
        }
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!boundingBox) {
                return
            }
            
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = "#8F00FF88";            
            ctx.fillRect(boundingBox[0], boundingBox[1], boundingBox[2] - boundingBox[0], boundingBox[3] - boundingBox[1]); // Coordinates are transformed
            ctx.beginPath()
            ctx.arc(canvas.width / 2, canvas.height / 2, 1, 0, 360)
            ctx.fill()
            ctx.closePath()
            ctx.restore();
        };

        draw();

    }, [scale, boundingBox, offsetX, offsetY])

    useEffect(() => {
        const syncCanvasSize = () => {
            const canvas = canvasRef.current
            const image = imgRef.current
            if (!canvas || !image) {
                return
            }
            const nextWidth = Math.max(1, Math.round(image.clientWidth))
            const nextHeight = Math.max(1, Math.round(image.clientHeight))
            if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
                canvas.width = nextWidth
                canvas.height = nextHeight
            }
        }

        syncCanvasSize()
        window.addEventListener("resize", syncCanvasSize)
        return () => {
            window.removeEventListener("resize", syncCanvasSize)
        }
    }, [imageSrc])

    if (file == null) {
        return null
    } else
        return (
            <Paper sx={{
                position: "relative",
                overflow: "hidden",
                margin: 1,
                width: "auto",
                height: "auto"
            }}>
                <Box
                    ref={boxRef}
                    sx={{
                        position: "relative",
                        overflow: "hidden",
                        width: "auto",
                        touchAction: "none",
                    }}
                    onMouseDown={onMouseDown}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onMouseMove={onMouseMove}
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
                            style={{
                                width: "100%",
                                height: "auto",
                                display: "block",
                                cursor: cursor,
                            }}
                        />}
                        <canvas
                            ref={canvasRef}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                display: "block",
                                cursor: cursor,
                                pointerEvents: "auto"
                            }}
                        />
                    </Box>
                </Box>
                <Box sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    zIndex: 10,
                }}>
                <ToggleButtonGroup
                    value={selectedOption}
                    exclusive
                    onChange={handleToggle}
                    aria-label="Pan or Label"
                    sx={{
                        gap: "0.5rem",
                        background: "#cccccc44"
                    }}
                >
                    <ToggleButton value={CanvasOption.Pan} aria-label="Pan">
                        {selectedOptionToCursor[CanvasOption.Pan]}
                    </ToggleButton>
                    <ToggleButton value={CanvasOption.Label} aria-label="Label">
                        {selectedOptionToCursor[CanvasOption.Label]}
                    </ToggleButton>
                    <ToggleButton value={CanvasOption.ZoomIn} aria-label="ZoomIn">
                        {selectedOptionToCursor[CanvasOption.ZoomIn]}
                    </ToggleButton>
                    <ToggleButton value={CanvasOption.ZoomOut} aria-label="ZoomOut">
                        {selectedOptionToCursor[CanvasOption.ZoomOut]}
                    </ToggleButton>
                    <Tooltip title="Run plate detector on this image.">
                    <IconButton aria-label="" onClick={()=> {
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
                </ToggleButtonGroup>
                </Box>
            </Paper>
        )
}

export default DetectView
