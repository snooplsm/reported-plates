import { Box, Typography } from "@mui/material"
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
            alignContent: "center",
            alignItems: "center"
        }}
        >
            {/* <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 500 }}>License Plate</Typography> */}
            <LicensePlate onPlateChange={onPlateChange} plate={plate} />
        </Box>
        <Box
        >
            <LicensePlateImage image={plate?.image} />
        </Box>
    </>)
}