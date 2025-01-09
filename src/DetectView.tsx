import React, { useEffect, useRef, useState } from 'react'
import { canvasToBlob, DetectBox, detectPlate, downloadMatAsImage, PlateDetection } from './api/segment';
import Box from '@mui/material/Box';
import LicensePlate from './LicensePlate';
import LicensePlateImage from './LicensePlateImage';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import HighlightAltIcon from '@mui/icons-material/HighlightAlt';
import PanToolIcon from '@mui/icons-material/PanTool';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import cv from "@techstark/opencv-js";
import heic2any from "heic2any";

type DetectProps = {
    file: File; // The title displayed on the card
    boxes?: DetectBox[]
};

enum CanvasOption {
    Pan = "Pan",
    Label = "Label",
    ZoomIn = "ZoomIn",
    ZoomOut = "ZoomOut"
}

const DetectView: React.FC<DetectProps> = ({ file, boxes }) => {

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [plate, setPlate] = useState<PlateDetection>()

    const [scale, setScale] = useState<number>(1); // Track zoom level
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [transformOrigin, setTransformOrigin] = useState<{ x: string; y: string }>({
        x: "center",
        y: "center",
    }); // Track zoom origin

    const selectedOptionToCursor: Record<CanvasOption, [React.ReactElement,string]> = {
        [CanvasOption.Pan]: [<PanToolIcon/>,"grab"],
        [CanvasOption.Label]: [<HighlightAltIcon/>,"crosshair"],
        [CanvasOption.ZoomIn]: [<ZoomInIcon/>,"zoom-in"],
        [CanvasOption.ZoomOut]: [<ZoomOutIcon/>,"zoom-out"]
    }
    const [selectedOption, setSelectedOption] = useState<CanvasOption | null>(CanvasOption.Pan);
    const [cursor, setCursor] = useState<string>("grab")

    const handleToggle = (event: React.MouseEvent<HTMLElement>, newOption: CanvasOption | null) => {
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

    const onMouseDown = (e: React.MouseEvent) => {
        // console.log("onMouseDown")
        e.preventDefault()
        if(selectedOption === CanvasOption.Label) {
            setIsDragging(true)
        }
        if(selectedOption === CanvasOption.Pan) {
            setIsPanning(true)
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
        const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor
        
        // Adjust coordinates for the canvas scale and offset
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setPosition([x, y])
    }

    useEffect(() => {
        console.log("position changed", position)
    }, [position])

    const onMouseUp = (e: React.MouseEvent) => {
        if(isDragging && boundingBox) {
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
            const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor
            const scaleX3 = imgRef.current.naturalWidth / rect.width
            const scaleY3 = imgRef.current.naturalHeight / rect.height
            const bbox = boundingBox
            const bbox2 = bbox.map(x => x * scale);
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            const image = new Image()
            image.src = imageSrc
            image.onload = async () => {
                console.log(bbox)
                const mat = cv.imread(image)
                console.log("bounding box", bbox)                
                // console.log("boudning box2", bbox2)
                const offsetX1 = offsetX / 100
                const offsetY1 = offsetX / 100
                const width = mat.cols
                const height = mat.rows
                const scaleX2 = rect.width / width; // Horizontal scaling factor
                const scaleY2 = rect.height/height; // Vertical scaling factor
                console.log("up", `size: ${width}x${height}`,
            "scaleX:", scaleX.toFixed(4), "scaleY", scaleY.toFixed(4), "offsetX:", offsetX.toFixed(4)+"%", "offsetY:",
            offsetY.toFixed(4)+"%", "scale:", scale.toFixed(4), "rect:",rect, "bbox:", boundingBox.map(x=>x.toFixed(4)))
                console.log("x",x,"y",y)
                const scaledBox = bbox.map((x, i) => {
                    const scale = (i % 2 === 0) ? scaleX : scaleY; // Determine scale based on index
                    return x / scale; // Apply scaling
                  });
                console.log("scaledBox", scaledBox)
                const x1 = scaledBox[0] / scaleX2
                const y1 = scaledBox[1] / scaleY2
                const x2 = scaledBox[2] / scaleX2
                const y2 = scaledBox[3] /scaleY2
                // const y2 = (offsetY / 100) * height - bbox[3]* offsetX/100
                console.log(x1,y1,x2,y2)
                const rectRoi = new cv.Rect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1))
                console.log(rectRoi)
                const roi = mat.roi(rectRoi)
                cv.cvtColor(roi, roi, cv.COLOR_RGBA2RGB);
                mat.delete()
                const plate = detectPlate(roi)
                console.log("plate", plate)
                // URL.revokeObjectURL(image.src)
            }
            

        }
        setIsDragging(false)
        setIsPanning(false)
    }

    const onMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
        const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor

        // Adjust coordinates for the canvas scale and offset
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (isDragging) {
            // console.log("pressed", "x:",x.toFixed(4), "y:",y.toFixed(4), 
            // "scaleX:", scaleX.toFixed(4), "scaleY", scaleY.toFixed(4), "offsetX:", offsetX.toFixed(4)+"%", "offsetY:",
            // offsetY.toFixed(4)+"%", "scale:", scale.toFixed(4), "rw:",rect.width.toFixed(4), "rh:",rect.height.toFixed(4), "rl:", rect.left.toFixed(4), "rt:",rect.top.toFixed(4))
            const box = [position[0], position[1], x, y]
            console.log("box", box, "width", rect.width)
            setBoundingBox(box)
        } else if (isPanning) {
            // console.log("not pressed", x, y)
            console.log("isPanning")
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            const dx = (position[0] - x) / scale;
            const dy = (position[1] - y) / scale;
            console.log("panning at scale", scale, dx,dy)
            setOffsetX((prevOffsetX) => prevOffsetX + dx);
            setOffsetY((prevOffsetY) => prevOffsetY + dy);

            setPosition([x,y])
        }
    }

    useEffect(()=> {
        setTransformOrigin({
            x: `${offsetX}%`,
            y: `${offsetY}%`,
        });
    }, [offsetX,offsetY])

    const handleWheel = (e: WheelEvent) => {
        console.log("wheel")
        e.preventDefault();    

        const newScale = scale + e.deltaY * -0.004; // Adjust scale
        setScale(Math.min(Math.max(newScale, 1), 8)); // Clamp zoom level between 1x and 5x
    };

    useEffect(() => {
        const fetchImage = async () => {
          if (imageSrc) return; // Prevent redundant execution
          let file2Use: string;
    
          if (file.type.toLowerCase() === "image/heic") {
            const uuu = URL.createObjectURL(file);
            try {
              const blob: Blob = await (await fetch(uuu)).blob();
              const converted = await heic2any({
                blob,
                toType: "image/jpeg",
              });
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
    }, [boxRef.current, scale])

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (ctx == null) {
            return
        }
        if (canvas == null) {
            return
        }
        // console.log(boundingBox)
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // console.log("clear",0,0,canvas.width,canvas.height)
            if (!boundingBox) {
                return
            }
            // ctx.save();

            // Apply transformations
            // ctx.scale(scale, scale);
            // ctx.translate(offsetX / scale, offsetY / scale);
            // console.log("drawing", boundingBox)
            // Example: Draw a rectangle
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = "#8F00FF88";
            // ctx.fillRect()
            // console.log("drawing",boundingBox[0], boundingBox[1], boundingBox[2]-boundingBox[0], boundingBox[3]-boundingBox[1])
            ctx.fillRect(boundingBox[0], boundingBox[1], boundingBox[2] - boundingBox[0], boundingBox[3] - boundingBox[1]); // Coordinates are transformed
            ctx.beginPath()
            ctx.arc(canvas.width/2,canvas.height/2,1, 0,360)
            ctx.fill()
            ctx.closePath()
            ctx.restore();
        };

        draw();

    }, [scale, boundingBox, offsetX, offsetY])

    if (imageSrc == null) {
        return null
    } else
        return (<Box>
            <Box
                ref={boxRef}
                sx={{
                    position: "relative",
                    overflow: "hidden",
                    maxWidth: "608px",
                    width: "100%",
                    height: "auto", // Maintain aspect ratio                
                }}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onMouseMove={onMouseMove}
            >

                <img
                    ref={imgRef}
                    src={imageSrc}
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: `${transformOrigin.x} ${transformOrigin.y}`, // Adjust based on mouse location
                        width: "100%",
                        height: "auto",
                        display: "block", // Prevent inline-block issues
                        cursor: cursor,
                    }}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: "absolute", // Overlay canvas on top of the image
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        display: "block", // Ensures the canvas behaves like an inline element
                        cursor: cursor,
                        pointerEvents: "auto"
                    }}
                />
            </Box>
            <ToggleButtonGroup
                value={selectedOption}
                exclusive
                onChange={handleToggle}
                aria-label="Pan or Label"
                sx={{
                    display: "flex",
                    gap: "0.5rem",
                    margin: "1rem",
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
            </ToggleButtonGroup>
            {plate && <LicensePlate plate={plate} />}
            {plate && plate.image && <LicensePlateImage image={plate.image} />}
        </Box>
        )
}

export default DetectView
