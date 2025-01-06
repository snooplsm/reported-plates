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
    const [transformOrigin, setTransformOrigin] = useState<{ x: string; y: string }>({
        x: "center",
        y: "center",
    }); // Track zoom origin

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const boxRef = useRef<HTMLElement | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const onMouseDown = (e: React.MouseEvent) => {
        console.log("onMouseDown")
        e.preventDefault()
        setIsDragging(true)
        setPosition({ x: e.clientX, y: e.clientY })
    }

    const onMouseUp = (e: React.MouseEvent) => {
        setIsDragging(false)
    }

    const onMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            console.log("pressed")
        } else {
            console.log("not pressed")
        }
    }

    const handleWheel = (e: WheelEvent) => {
        console.log("wheel")
        e.preventDefault();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const offsetX = ((e.clientX - rect.left) / rect.width) * 100; // Percentage X
        const offsetY = ((e.clientY - rect.top) / rect.height) * 100; // Percentage Y

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
                cursor: scale > 1 ? "move" : "default",
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
                            pointerEvents: "none", // Prevent interference when not drawing
                        }}                        
                    />            
            </Box>
            {plate && <LicensePlate plate={plate} />}
            {plate && plate.image && <LicensePlateImage image={plate.image} />}
        </Box>
        )
}

export default DetectView