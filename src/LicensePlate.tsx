import { useEffect, useRef, useState } from "react";
import { Box,  Menu, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import { PlateDetection, refinePlateForTLC } from "./api/segment";
import { NYSTATE, State,  StatePres,  states } from "./States";

type LicensePlateProps = {
  plate?: PlateDetection; // The text on the license plate
  onPlateChange?: (plate:PlateDetection) => void
};

const LicensePlate = ({ plate, onPlateChange = ()=>{} }: LicensePlateProps) => {

  const [color, setColor] = useState(NYSTATE.plate.color)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [bottomText, setBottomText] = useState("")
  const [bottomTextColor, setBottomTextColor] = useState(NYSTATE.bottom.color)
  const [bottomBgColor, setBottomBgColor] = useState(NYSTATE.bottom.bg)
  const [plateText, setPlateText] = useState("")
  const [menuOpen,setMenuOpen] = useState(false)

  const [plateState, setPlateState] = useState(NYSTATE)

  const handleMenuItemClick = (state:StatePres) => {
    setPlateState(state);
    setMenuOpen(false);
  };


  useEffect(() => {
    setPlateText(plate?.text || "NONE")
    if(plate) {
      onPlateChange(plate)
    }
  }, [plate]);

  useEffect(() => {
    const font = plateState.plate.color || "#000";
    const bottomBgColor = plateState.bottom.bg || "";
    const bottomTextColor = plateState.bottom.color || "";
    setBottomTextColor(bottomTextColor);
    setBottomBgColor(bottomBgColor);
    let bottomText = plateState.bottom.text
    if (typeof bottomText != 'string') {
      const [, tlc] = refinePlateForTLC(plateText)
      const func = bottomText as (tlc: boolean) => string
      bottomText = func(tlc || plate?.tlc || false)
    }
    setColor(font);
    setBottomText(bottomText);
    if(plate) {
      plate.plateOverride = plateText
      plate.state = plateState.state
      onPlateChange(plate)
    }
    
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
          placeholder="NONE"
          InputProps={{
            disableUnderline: true, // Disable underline
            sx: {
              fontSize: "3.2vh",
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
            onPlateChange(plate || {
              text: refined.toUpperCase(),
              state: plateState.state,
              tlc: tlc,
            } as PlateDetection)
          }}
          value={plateText.toUpperCase()}
        />
      </Box>
      {plateState.state == State.NY && <>
        <Box
          sx={{
            position: 'absolute',
            top: ".5vh",
            width: "22%",
            zIndex: 3,
            height: ".15rem", // Adjust thickness
            background: NYSTATE.plate.color
          }}>

        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: ".8vh",
            width: "22%",
            zIndex: 3,
            height: ".3rem", // Adjust thickness
            background: NYSTATE.bottom.color
          }}>

        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: ".5vh",
            right: 0,
            width: "22%",
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
            top: ".8vh",
            width: "22%",
            zIndex: 3,
            height: ".3rem", // Adjust thickness
            background: NYSTATE.bottom.color
          }}></Box>
      </>}

      <Box
      id="plate"
      sx={{
        position: "relative",
        top: 0,
        width: "100%",
        zIndex: 2,
        height: "30%", // Adjust thickness
        background: plateState.top.bg, // Background color
      }}
    >
      <Tooltip title="Click to change" placement="top">
        <Typography
          ref={anchorRef}
          onClick={()=>setMenuOpen(true)}
          sx={{
            fontSize: "1.33vw",
            color: plateState.top.color,
            height: "100%",
            paddingTop: ".1vh",
            textAlign: "center",
            whiteSpace: "nowrap", // Prevent text wrapping
            width: "100%",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {`${plateState.top.text}`}
        </Typography>
      </Tooltip>

      <Menu
        open={menuOpen}
        anchorEl={anchorRef.current}
        onClose={()=> setMenuOpen(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        {states.map((state, index) => (
          <MenuItem
            onClick={() => handleMenuItemClick(state)}
            key={`${state.state}_${index}`}
            value={state.state}
          >
            <Typography
              sx={{
                fontSize: "1.5rem",
                fontWeight: 600,
              }}
            >
              {`${state.top?.text || "No Text"}`}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
      {/* Bottom Yellow Line */}
      <Box
        sx={{
          position: "absolute", // Positioned at the bottom
          bottom: "2%",
          left: "0",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 0,
          width: "100%",
          height: "20%", // Adjust thickness
          backgroundColor: bottomBgColor, // Yellow color
        }}
      ><Typography
        sx={{
          fontSize: "1.3vh",
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