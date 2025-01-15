import { Box } from "@mui/material"
import LicensePlate from "./LicensePlate"
import LicensePlateImage from "./LicensePlateImage"
import { PlateDetection } from "./api/segment"

export interface DetectionProps {
    plate?: PlateDetection
}

export const DetectionView = ({ plate }: DetectionProps) => {
    return (<>
        <Box
        sx={{
            width: "100%",
            height: "auto"
        }}
        >
            <LicensePlate plate={plate} />
        </Box>
        <Box
        >
            <LicensePlateImage image={plate?.image} />
        </Box>
    </>)
}