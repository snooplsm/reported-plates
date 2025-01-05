import React from "react";
import { Box } from "@mui/material";

type LicensePlateImageProps = {
  image: Blob; // The image blob to display
};

const LicensePlateImage: React.FC<LicensePlateImageProps> = ({ image }) => {
  // Convert the Blob to a URL
  const imageUrl = URL.createObjectURL(image);

  return (
    <Box
      sx={{
        width: "20rem",
        height: "20rem",
        border: "1px solid #ccc",
        borderRadius: "0.5rem",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#f9f9f9",
      }}
    >
      <img
        src={imageUrl}
        alt="License Plate"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
    </Box>
  );
};

export default LicensePlateImage;