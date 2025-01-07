import React, { useEffect, useRef, useState } from 'react'
import { DetectBox, PlateDetection } from './api/segment';
import Box from '@mui/material/Box';
import LicensePlate from './LicensePlate';
import LicensePlateImage from './LicensePlateImage';

type DetectProps = {
    file: File; // The title displayed on the card
    boxes?: DetectBox[]
};


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

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const boxRef = useRef<HTMLElement | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState([0,0,0,0]);
    const [boundingBox, setBoundingBox] = useState<[x1:number,y1:number,x2:number,y2:number]>()

    const onMouseDown = (e: React.MouseEvent) => {
        // console.log("onMouseDown")
        e.preventDefault()
        setIsDragging(true)
        const rect = e.currentTarget.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
        const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor
    
        // Adjust coordinates for the canvas scale and offset
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
    
        setPosition([x,y])
    }

    const onMouseUp = (e: React.MouseEvent) => {
        setIsDragging(false)
    }

    const onMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
        const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor
    
        // Adjust coordinates for the canvas scale and offset
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
    
        if (isDragging) {
            console.log("pressed", x, y, scaleX, scaleY, offsetX, offsetY, scale)
            setBoundingBox([position[0],position[1], x,y])
        } else {
            // console.log("not pressed", x, y)
        }
    }

    const handleWheel = (e: WheelEvent) => {
        console.log("wheel")
        e.preventDefault();
        const rect = (canvasRef.current as HTMLElement).getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width; // Horizontal scaling factor
        const scaleY = canvasRef.current.height / rect.height; // Vertical scaling factor

        // Adjust coordinates for the canvas scale and offset
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const offsetX = ((e.clientX - rect.left) / rect.width) * 100; // Percentage X
        const offsetY = ((e.clientY - rect.top) / rect.height) * 100; // Percentage Y
        setOffsetX(offsetX)
        setOffsetY(offsetY)
        setTransformOrigin({
            x: `${offsetX}%`,
            y: `${offsetY}%`,
        });

        const newScale = scale + e.deltaY * -0.003; // Adjust scale
        setScale(Math.min(Math.max(newScale, 1), 6)); // Clamp zoom level between 1x and 5x
    };

    useEffect(() => {
        if (!imageSrc) {
            const u = URL.createObjectURL(file)
            setImageSrc(u)
        }
        const detect = boxes?.[0]?.plate || null;
        if (detect) {
            setPlate(detect)
        }        
    }, [boxes])

    useEffect(()=> {
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

        if(ctx==null) {
            return
        }
        if(canvas==null) {
            return
        }
        // console.log(boundingBox)
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // console.log("clear",0,0,canvas.width,canvas.height)
            if(!boundingBox) {
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
            ctx.fillRect(boundingBox[0], boundingBox[1], boundingBox[2]-boundingBox[0], boundingBox[3]-boundingBox[1]); // Coordinates are transformed
            
            ctx.restore();
          };
    
          draw();
    
    }, [scale,boundingBox, offsetX, offsetY])

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
                        transition: "transform 0.1s ease, transform-origin 0.1s ease",
                        cursor: scale > 1 ? "grab" : "default",
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
                            cursor: "crosshair",
                        }}                        
                    />            
            </Box>
            {plate && <LicensePlate plate={plate} />}
            {plate && plate.image && <LicensePlateImage image={plate.image} />}
        </Box>
        )
}

export default DetectView