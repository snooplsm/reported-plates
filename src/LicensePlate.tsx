import React, { useEffect, useRef, useState } from "react";
import { Box, FormControl, Menu, MenuItem, Select, TextField, Tooltip, Typography } from "@mui/material";
import { PlateDetection, refinePlateForTLC } from "./api/segment";
import { NYSTATE, State, StatePres, states } from "./States";

type LicensePlateProps = {
  plate?: PlateDetection; // The text on the license plate
  plateOverride?: string
};

const LicensePlate = ({ plate, plateOverride }: LicensePlateProps) => {

  const [color, setColor] = useState(NYSTATE.plate.color)
  const [bgColor, setBgColor] = useState(NYSTATE.plate.bg)
  const [bottomText, setBottomText] = useState("")
  const [bottomTextColor, setBottomTextColor] = useState(NYSTATE.bottom.color)
  const [bottomBgColor, setBottomBgColor] = useState(NYSTATE.bottom.bg)
  const [fontSize, setFontSize] = useState("")
  const [plateText, setPlateText] = useState("")
  const [menuOpen,setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLElement>()

  const stateRef = useRef<HTMLSelectElement>(null)

  const [plateState, setPlateState] = useState(NYSTATE)

  useEffect(() => {
    setPlateText(plate?.text || plateOverride || "NONE")
  }, [plate, plateOverride]);

  useEffect(() => {
    let fontSize = "3.9rem";
    if (plateText.length > 6) {
      fontSize = "3.2rem";
    }
    const font = plateState.plate.color || "#000";
    const bg = plateState.plate.bg || "#FFF"
    const bottomBgColor = plateState.bottom.bg || "";
    const bottomTextColor = plateState.bottom.color || "";
    setBottomTextColor(bottomTextColor);
    setBottomBgColor(bottomBgColor);
    let bottomText = plateState.bottom.text
    if (typeof bottomText != 'string') {
      const [licensePlate, tlc] = refinePlateForTLC(plateText)
      const func = bottomText as (tlc: boolean) => string
      bottomText = func(tlc || plate?.tlc || false)
    }
    setColor(font);
    setBgColor(bg);
    setBottomText(bottomText);
    setFontSize(fontSize)
  }, [plateState, plateText])

  return (
    <Box
      sx={{
        width: "100%", // Use rem instead of px for width
        aspectRatio: "2/1",
        background: plateState.plate.bg,
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
    >
      <Box
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
        <TextField
          variant="standard" // Remove outlined or filled styling
          InputProps={{
            disableUnderline: true, // Disable underline
            sx: {
              fontSize: "clamp(10px, 3vw, 2.3rem)",
              fontWeight: 600,  // Remove padding
              textAlign: "center",
              width: "100%",
              overflow: "visible"
            }

          }}
          inputProps={{
            maxLength: 9
          }}
          sx={{
            fontWeight: 600,
            "& .MuiInputBase-input": {
              textAlign: "center", // Center-align input text
            },
            "& .MuiInput-root": {
              border: "none", // No border
              justifyContent: "center", // Ensure alignment
            },
          }}
          onChange={(text) => {
            const [refined, tlc] = refinePlateForTLC(text.currentTarget.value)
            setPlateText(refined)
          }}
          value={plateText.toUpperCase()}
        />
      </Box>
      {plateState.state == State.NY && <>
        <Box
          sx={{
            position: 'absolute',
            top: ".8rem",
            width: "25%",
            zIndex: 3,
            height: ".15rem", // Adjust thickness
            background: NYSTATE.plate.color
          }}>

        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: "1rem",
            width: "25%",
            zIndex: 3,
            height: ".3rem", // Adjust thickness
            background: NYSTATE.bottom.color
          }}>

        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: ".8rem",
            right: 0,
            width: "25%",
            zIndex: 3,
            height: ".15rem", // Adjust thickness
            background: NYSTATE.plate.color
          }}>

        </Box>
        <Box
          id="bottomColor"
          sx={{
            position: 'absolute',
            right: 0,
            top: "1rem",
            width: "25%",
            zIndex: 3,
            height: ".3rem", // Adjust thickness
            background: NYSTATE.bottom.color
          }}></Box>
      </>}

      <Box
        id="plate"
        sx={{
          position: 'relative',
          top: "0",
          width: "100%",
          zIndex: 2,
          // alignItems: "center",
          // justifyContent: "center",

          height: "33%", // Adjust thickness
          background: plateState.top.bg, // Blue color
        }}
      > {true &&<><Tooltip title="Click to change" placement="top"><Typography
        onClick={()=> {
          setMenuOpen(true)
        }}
        sx={{
          fontSize: "clamp(10px, 2rem, 1.25rem)",
          color: plateState.top.color,
          height: "100%",
          paddingTop: "2%",
          textAlign: "center",
          textWrap: "nowrap",
          width: "100%",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >{plateState.top.text}</Typography></Tooltip></>}
        {<Menu open={menuOpen} onClose={()=> setMenuOpen(false)}>

            {states.map((state, index) => <MenuItem onClick={()=> {setPlateState(state); setMenuOpen(false)}} key={`${state.state}_${index}`} value={state}><Typography
              sx={{
                fontSize: "1.5rem",
                fontWeight: 600,
              }}
            >
              {state.top.text as string}
            </Typography></MenuItem>)}
          </Menu>}
          </Box>
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
          fontSize: "clamp(.5, 1.1vw, 1.2rem)",
          zIndex: 2, // Higher than the lines
          fontWeight: 600,
          color: plateState.bottom.altColor?.(plate?.tlc || false) || bottomTextColor, // Default text color
        }}
      >
          {bottomText}
        </Typography></Box>

    </Box >
  );
};

export default LicensePlate;