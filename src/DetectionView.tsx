import { Box } from "@mui/material"
import LicensePlate from "./LicensePlate"
import LicensePlateImage from "./LicensePlateImage"

export interface DetectionProps {

}

export const DetectionView = ({ }: DetectionProps) => {
    return (<>
        <Box
        position="relative"
        >
            <LicensePlate plate={undefined} />
        </Box>
        <Box
            sx={{
                flexGrow: 1,
                flexShrink: 0,      // Prevent shrinking
            }}
        >
            <LicensePlateImage image={undefined} />
        </Box>
    </>)
}