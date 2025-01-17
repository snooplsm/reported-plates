import { Box } from "@mui/material"
import LicensePlate from "./LicensePlate"
import LicensePlateImage from "./LicensePlateImage"
import { PlateDetection } from "./api/segment"

export interface DetectionProps {
    plate?: PlateDetection
    onPlateChange: (plate:PlateDetection) => void
}

export const DetectionView = ({ plate, onPlateChange }: DetectionProps) => {
    return (<>
        <Box
        sx={{
            width: "100%",
            height: "auto"
        }}
        >
            <LicensePlate onPlateChange={onPlateChange} plate={plate} />
        </Box>
        <Box
        >
            <LicensePlateImage image={plate?.image} />
        </Box>
    </>)
}