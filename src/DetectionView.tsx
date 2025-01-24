import { Box, IconButton, Typography } from "@mui/material"
import LicensePlate from "./LicensePlate"
import LicensePlateImage from "./LicensePlateImage"
import { DetectBox, PlateDetection } from "./api/segment"
import NextPlanOutlinedIcon from '@mui/icons-material/NextPlanOutlined';
import { useEffect, useState } from "react";

export interface DetectionProps {
    plate?: PlateDetection,
    boxes?: DetectBox[],
    onPlateChange: (plate: PlateDetection) => void
    onCarWithPlate?:(result:DetectBox[], car: DetectBox) => void
}

export const DetectionView = ({ plate, onPlateChange, onCarWithPlate = ()=>{}, boxes = [] }: DetectionProps) => {

    const [carsWithPlate, setCarsWithPlate] = useState<DetectBox[]>([])

    const [currentIndex, setCurrentIndex] = useState<number>(0)

    useEffect(() => {
        const filtered = boxes.filter(x => x.plate)
        if(plate) {
            const index = filtered.findIndex(x => x.plate === plate)
            setCarsWithPlate(filtered)
            setCurrentIndex(index)
        }
    }, [boxes, plate])

    return (<>
        <Box
            sx={{
                alignContent: "center",
                alignItems: "center",
            }}
        >
            {/* <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 500 }}>License Plate</Typography> */}
            <LicensePlate onPlateChange={onPlateChange} plate={plate} />

        </Box>

        {carsWithPlate.length > 1 && <Box sx={{
            display: "flex", // Use flexbox
            justifyContent: "center", // Center horizontally
            width: "100%", // Full width container
            paddingRight: 1,
            gap: 1, // Add spacing between icons
        }}><IconButton onClick={()=> {
            const newIndex = Math.abs((currentIndex - 1) % carsWithPlate.length)
            setCurrentIndex(newIndex)
            onCarWithPlate(boxes, carsWithPlate[newIndex])
        }}>
                <NextPlanOutlinedIcon sx={{
                    transform: "scaleX(-1)", // Flip horizontally
                }} />
            </IconButton>
            <IconButton onClick={()=> {
                const newIndex = Math.abs((currentIndex + 1) % carsWithPlate.length)
                setCurrentIndex(newIndex)
                onCarWithPlate(boxes, carsWithPlate[newIndex])
        }}>
                <NextPlanOutlinedIcon />
            </IconButton>
        </Box>}
        <Box
        >
            <LicensePlateImage image={plate?.image} />
        </Box>
    </>)
}