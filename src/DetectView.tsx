import React, { useEffect, useState } from 'react'
import { DetectBox, PlateDetection } from './api/segment';
import Box from '@mui/material/Box';
import LicensePlate from './LicensePlate';

type DetectProps = {
    file: File; // The title displayed on the card
    boxes?: DetectBox[]
};


const DetectView:React.FC<DetectProps> = ({file,boxes}) => {

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [plate, setPlate] = useState<PlateDetection>()

    useEffect(() => {
        if(!imageSrc) {
            const u = URL.createObjectURL(file)
            setImageSrc(u)
        }
        const detect = boxes?.[0]?.plate || null;
        if(detect) {
            setPlate(detect)
        }
    }, [boxes])

    if (imageSrc == null) {
        return null
    } else
        return (<Box><Box component="img"
            src={imageSrc}
            sx={{
                maxWidth: "608px",
                width: "100%",
                height: "auto", // Maintain aspect ratio
            }} />
            {plate && <LicensePlate plate={plate}/>}
            </Box>
        )
}

export default DetectView