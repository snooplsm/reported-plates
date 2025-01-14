import React, { useEffect, useRef, useState } from "react";
import { Box, FormControl, MenuItem, Select, TextField, Typography } from "@mui/material";
import { PlateDetection, refinePlateForTLC } from "./api/segment";
import { NYSTATE, State, StatePres, states } from "./States";

type LicensePlateProps = {
  plate?: PlateDetection; // The text on the license plate
};

const LicensePlate: React.FC<LicensePlateProps> = ({ plate }) => {

  const [color, setColor] = useState(NYSTATE.plate.color)
  const [bgColor, setBgColor] = useState(NYSTATE.plate.bg)
  const [bottomText, setBottomText] = useState("")
  const [bottomTextColor, setBottomTextColor] = useState(NYSTATE.bottom.color)
  const [bottomBgColor, setBottomBgColor] = useState(NYSTATE.bottom.bg)
  const [fontSize, setFontSize] = useState("")
  const [plateText, setPlateText] = useState("")

  const stateRef = useRef<HTMLSelectElement>(null)

  const [plateState, setPlateState] = useState(NYSTATE)

  useEffect(() => {
    setPlateText(plate?.text || "NONE")
  }, [plate]);

  useEffect(() => {
    let fontSize = "3.9rem";
    if (plateText.length > 6) {
      fontSize = "3.5rem";
    }
    const font = plateState.plate.color || "#000";
    const bg = plateState.plate.bg || "#FFF"
    const bottomBgColor = plateState.bottom.bg || "";
    const bottomTextColor = plateState.bottom.color || "";
    setBottomTextColor(bottomTextColor);
    setBottomBgColor(bottomBgColor);
    let bottomText = plateState.bottom.text
    if (typeof bottomText != 'string') {
      const [licensePlate,tlc] = refinePlateForTLC(plateText)
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
        width: "20rem", // Use rem instead of px for width
        height: "10rem", // Use rem instead of px for height
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
              fontSize: fontSize,
              fontWeight: 600,  // Remove padding
              textAlign: "center",
              width: "100%",              
            }
            
          }}
          inputProps={{
            maxLength: 9
          }}
          sx={{
            fontSize: fontSize,
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
            const [refined,tlc] = refinePlateForTLC(text.currentTarget.value)
            setPlateText(refined)
          }}
          value={plateText}
        />
      </Box>
      {plateState.state==State.NY && <>
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
          top: "1.3rem",
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
        sx={{
          position: 'absolute',
          right: 0,
          top: "1.3rem",
          width: "25%",
          zIndex: 3,
          height: ".3rem", // Adjust thickness
          background: NYSTATE.bottom.color
        }}></Box>
        </>}
        
      <Box
        sx={{
          position: 'absolute',
          top: "-.5rem",
          width: "100%",
          zIndex: 2,
          alignItems: "center",
          justifyContent: "center",
          height: "3.3rem", // Adjust thickness
          background: plateState.top.bg, // Blue color
        }}
      ><FormControl>
          <Select
            labelId="dropdown-label"
            value={plateState}
            ref={stateRef}
            onOpen={(k) => {
              const cur = stateRef.current
              if (!cur) {
                return
              }
              const value = plateState
              setTimeout(() => {
                const currentMenuItem = document.querySelector(
                  `.MuiMenuItem-root[data-value="${value}"]`
                );

                if (currentMenuItem) {
                  let targetMenuItem = currentMenuItem;
                  let offset = 4
                  let steps = offset;

                  // Traverse `previousElementSibling` `offset` times
                  while (steps > 0 && targetMenuItem.previousElementSibling) {
                    targetMenuItem = targetMenuItem.previousElementSibling;
                    steps--;
                  }

                  // Check if the final target is a MenuItem
                  if (targetMenuItem && targetMenuItem.classList.contains("MuiMenuItem-root")) {
                    console.log(`Scrolling to the MenuItem ${offset} steps before:`, targetMenuItem);
                    targetMenuItem.scrollIntoView(true);
                  } else {
                    console.log(`No MenuItem found ${offset} steps before`);
                    currentMenuItem.scrollIntoView(true)
                  }
                } else {
                  console.log("MenuItem not found for value:", value);
                }
              }, 0)

            }}
            onChange={(k) => {
              const value = k.target.value as StatePres
              console.log(value.plate.bg)
              setPlateState(value)
            }
            }
            disableUnderline
            sx={{
              fontSize: "1.5rem",
              fontWeight: 600,
              textAlign: "center",
              background: "none",
              border: "none",
              boxShadow: "none",
              color: plateState.top.color,
              outline: "none",
              "& fieldset": {
                border: "none", // Ensures the outlined border is removed
              },
              "&:hover": {
                border: "none", // Removes border on hover
              },
              cursor: "pointer", // Ensure pointer cursor for usability
              "& .MuiSelect-icon": {
                color: plateState.top.color, // Arrow color
              },
              "&:focus": {
                outline: "none", // Remove focus outline
              },
              "& .Mui-selected": {
                color: plateState.top.color, // Adjust the selected text color
              },
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: "400px", // Limit the height of the dropdown
                  overflowY: "auto", // Make it scrollable
                },
              }
            }
            }
          >
            {states.map((state, index) => <MenuItem key={`${state.state}_${index}`} value={state}><Typography
              sx={{
                fontSize: "1.5rem",
                fontWeight: 600,
              }}
            >
              {state.top.text as string}
            </Typography></MenuItem>)}
          </Select>
        </FormControl></Box>

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

    </Box >
  );
};

export default LicensePlate;