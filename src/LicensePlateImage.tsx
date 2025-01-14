import React from "react";
import { Box, Typography } from "@mui/material";

type LicensePlateImageProps = {
  image?: Blob; // The image blob to display
};

const LicensePlateImage: React.FC<LicensePlateImageProps> = ({ image }) => {
  // Convert the Blob to a URL
  const imageUrl = image && URL.createObjectURL(image);

  return (
    <Box
      sx={{        
        overflow: "hidden",
        display: "flex",
        flex: 1,
        justifyContent: "center",
        // alignItems: "center",
        // f: "100%",
      }}
    >
      {imageUrl && <img
        src={imageUrl}
        alt="License Plate"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />}
      {!imageUrl && <Typography sx={{fontSize: ".75rem", padding: ".5rem"}}>Upload a photo to detect a license plate</Typography>}
    </Box>
  );
};

export default LicensePlateImage;