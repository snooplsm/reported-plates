import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { PlateDetection } from "./api/segment";

type LicensePlateProps = {
  plate: PlateDetection; // The text on the license plate
};

const LicensePlate: React.FC<LicensePlateProps> = ({ plate }) => {

  const [color, setColor] = useState("#000")
  const [bgColor, setBgColor] = useState("#FFF")
  const [topText, setTopText] = useState("")
  const [bottomText, setBottomText] = useState("")
  const [topTextColor, setTopTextColor] = useState("#FFF")
  const [bottomTextColor, setBottomTextColor] = useState("#FFF")
  const [bottomBgColor, setBottomBgColor] = useState("")
  const [topBgColor, setTopBgColor] = useState("")

  const stateColorsText = {
    'NY': "#0B0C14", // Blue
    'PA': "#0E1756", // Yellow
    'NJ': "#000", // Green
    'CT': "#0A142E", // Orange
  };

  const stateColorsBG = {
    'NJ': "linear-gradient(to bottom, #FFF44F, #FFFFFF)",
    'NY': "#FFF",
    'CT': "linear-gradient(to bottom, #ADD8E6, #FFFFFF)",
    'PA': "#FFF"
  }

  const stateBottomText = {
    'NYtrue': 'TL&C',
    'NYfalse': 'EXCELISOR',
    'PA': 'visitPA.com',
    'NJ': 'Garden State',
    'CT': 'Constitution State'
  }

  const stateTopText = {
    'NY': 'NEW YORK',
    'PA': 'PENNSYLVANIA',
    'NJ': 'NEW JERSEY',
    'CT': 'CONNECTICUT'
  }

  const stateBottomTextColor = {
    'NY': '#ED9C36',
    'PA': '#000',
    'NJ': '#000',
    'CT': ''
  }

  const stateTopBgColor = {
    'NY': '#00000000',
    'PA': '#0E1756',
    'NJ': '#00000000',
    'CT': '#00000000'
  }

  const stateBottomBgColor = {
    'NY': '#00000000',
    'PA': '#F0CA38',
    'NJ': '#00000000',
    'CT': '#00000000'
  }

  useEffect(() => {
    let fontSize = "3.9"
    if (plate.text && plate.text?.length > 6) {
      fontSize = "3.5"
    }
    const font = stateColorsText[plate.state || ""] || "#000"
    const bg = stateColorsBG[plate.state || ""] || "#FFF"
    const topText = stateTopText[plate.state || ""] || ""
    const topTextColor = stateTopText[plate.state || ""] || ""
    const bottomTextColor = "#000"
    const topBgColor = stateTopBgColor[plate.state||""] || ""
    const bottomBgColor = stateBottomBgColor[plate.state||""] || ""
    setTopTextColor(topTextColor)
    setBottomTextColor(bottomTextColor)
    setBottomBgColor(bottomBgColor)
    setTopBgColor(topBgColor)
    const bottomText = stateBottomText[plate.state || ""] || stateBottomText[`${plate.state}${plate.tlc || false}`] || ""
    setColor(font)
    setBgColor(bg)
    setTopText(topText)
    setBottomText(bottomText)
  }, [plate])

  return (
    <Box
      sx={{
        width: "20rem", // Use rem instead of px for width
        height: "10rem", // Use rem instead of px for height
        backgroundColor: bgColor,
        borderRadius: "1rem", // Rounded corners
        border: "0.2rem solid #000000", // Border thickness
        display: "flex",

        flexDirection: "column",
        boxShadow: "0rem 0.25rem 0.375rem rgba(0, 0, 0, 0.2)", // Shadow with rem
        fontFamily: "Arial, sans-serif",
        position: "relative",
        fontWeight: "bold",
        color: color,
        textAlign: "center",
        letterSpacing: "10rem",
        overflow: "hidden"
      }}
    >    <Box
      sx={{
        position: 'absolute',
        height: "100%",
        width: "100%",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
        <Typography
          sx={{
            fontSize: "3.9rem",
            fontWeight: 600,
            color: "#0E1756", // Default text color
          }}
        >
          {plate.text}
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          width: "100%",
          zIndex: 0,
          alignItems: "center",
          justifyContent: "center",
          height: "1.8rem", // Adjust thickness
          backgroundColor: topBgColor, // Blue color
        }}
      ><Typography
        sx={{
          fontSize: "1.5rem",
          top: "0", // 
          left: "20%", // Center horizontally
          fontWeight: 600,
          color: topTextColor, // Default text color
        }}
      >
          {topText}
        </Typography></Box>

      {/* Bottom Yellow Line */}
      <Box
        sx={{
          position: "absolute", // Positioned at the bottom
          bottom: "0",
          left: "0",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 0,
          width: "100%",
          height: "2rem", // Adjust thickness
          backgroundColor: bottomBgColor, // Yellow color
        }}
      ><Typography
        sx={{
          fontSize: "1.3rem",
          zIndex: 2, // Higher than the lines
          fontWeight: 600,
          color: bottomTextColor, // Default text color
        }}
      >
          {bottomText}
        </Typography></Box>

    </Box>
  );
};

export default LicensePlate;