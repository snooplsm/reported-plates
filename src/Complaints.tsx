import { Box, Button, Paper, Typography } from "@mui/material"
import { useEffect, useRef, useState } from "react";
// import Lottie, { LottieRef, LottieRefCurrentProps } from 'lottie-react';
import Lottie from 'react-lottie-player'
import ranRedLight from "./lottie/ranredlight.json"
import reckless from "./lottie/reckless.json"
import noParking from "./lottie/parkedillegally.json"
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckIcon from '@mui/icons-material/Check';
import { Steps } from "./HowToGuide";
import TextFit from "react-textfit"
import { REPORT_FILE_ACCEPT } from "./api/file-utils";

export interface Complaint {
  type: ComplaintType;
  media: MediaType;
  src: string | any;
  lottieFrame?: number,
  lottieSpeed?: number
}

export enum ComplaintType {
  BlockedBikeLane = 'Blocked the bike lane',
  BlockedCrosswalk = 'Blocked the crosswalk',
  RanRedLight = 'Ran a red light or stop sign',
  ParkedIllegally = 'Parked illegally',
  DroveRecklessly = 'Drove recklessly'
}

export enum MediaType {
  Video = 'video',
  Image = 'image',
  Lottie = 'lottie'
}

export const complaints: Complaint[] = [
  {
    type: ComplaintType.BlockedBikeLane,
    media: MediaType.Image,
    src: `images/complaint/bikelane.svg`
  },
  {
    type: ComplaintType.BlockedCrosswalk,
    media: MediaType.Image,
    src: "images/complaint/crosswalk.svg"
  },
  {
    type: ComplaintType.RanRedLight,
    media: MediaType.Lottie,
    src: ranRedLight,
    lottieFrame: 20,
    lottieSpeed: 2.3
  },
  {
    type: ComplaintType.DroveRecklessly,
    media: MediaType.Lottie,
    src: reckless,
    lottieFrame: 50,
    lottieSpeed: 3
  },
  {
    type: ComplaintType.ParkedIllegally,
    media: MediaType.Lottie,
    lottieFrame: 50,
    lottieSpeed: 2,
    src: noParking
  }
]

export interface ComplaintProps {
  complaint: Complaint,
  index: number,
  size: number,
  width?: string,
  notHovered?: boolean,
  hoveredIndex?: number,
  forcePlay?: boolean
}

const handleDrop = (onFiles: (complaint: Complaint, files: File[]) => void, complaint: Complaint, e: React.DragEvent<HTMLDivElement>) => {
  // console.log("handle drop")
  e.preventDefault();
  // e.stopPropagation();
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    onFiles(complaint, files)
  }
};

export const ComplaintView = ({ complaint, index, size, notHovered, hoveredIndex }: ComplaintProps) => {
  const isActive = index === hoveredIndex

  const media = () => {
    const media = complaint.media
    if (media == MediaType.Image) {
      return (
        <Box component="img" key={complaint.type} src={complaint.src} sx={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",
          transform: isActive ? "scale(1.2)" : "scale(1)",
          transition: "transform 0.1s ease", // Smooth hover effect
          "&:hover": {
            transform: "scale(1.2)", // Scale image on hover        
            cursor: "pointer"
          }
        }} />
      )
    } else if (media == MediaType.Lottie) {
      return (
        <LottiePlayer forcePlay={isActive} complaint={complaint} notHovered={notHovered} index={index} size={size} />
      )
    }
  }

  return (
    <>
      {media()}
    </>
  )
}

interface ComplaintsProps {
  onFiles: (complaint: Complaint | undefined, file: File[]) => void,
  onPrepareUpload?: () => void,
  step?: Steps,
  hoveredStep?: Steps | undefined
  showCaption?: boolean,
  selectedComplaint?: Complaint
  onChange: (complaint?: Complaint) => void
  hideUpload?:boolean
}

export const ComplaintsView = ({ onFiles, onPrepareUpload, step, selectedComplaint, onChange, hideUpload=false, hoveredStep, showCaption }: ComplaintsProps) => {

  const inputRef = useRef<HTMLInputElement>()

  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>()

  const [selectedIndex, setSelectedIndex] = useState<number | undefined>()

  const handleSelect = (index: number) => {
    if (selectedIndex == index) {
      setSelectedIndex(undefined)
    } else {
      setSelectedIndex(index)
    }
  }

  useEffect(() => {
    if (selectedIndex != undefined) {
      onChange(complaints[selectedIndex])
    } else {
      onChange()
    }
  }, [selectedIndex])

  useEffect(() => {
    const selectedIndex = complaints.findIndex(k => k == selectedComplaint)
    if (selectedIndex > -1) {
      setSelectedIndex(selectedIndex)
    } else {
      setSelectedIndex(undefined)
    }
  }, [selectedComplaint])

  const [tooltip, setTooltip] = useState("Blocked")

  const [display, setDisplay] = useState<string | undefined>("hidden")

  useEffect(() => {
    // console.log("hoverIndex", hoveredIndex)
    if (selectedIndex != undefined) {
      setDisplay("inline")
      setTooltip(complaints[selectedIndex].type)
    } else {
      if (hoveredIndex != undefined) {
        // console.log("not undefined")
        setDisplay("inline")
        // console.log(complaints[hoveredIndex!].type)
        setTooltip(complaints[hoveredIndex!].type)
      } else {
        // console.log("undefined")
        if (selectedIndex != undefined) {
          setDisplay("inline")
        } else {
          setDisplay("hidden")
        }
      }
    }
  }, [hoveredIndex, selectedIndex])

  return (
    <Box position="relative">      
      <input
        ref={inputRef}
        accept={REPORT_FILE_ACCEPT}
        type="file"
        multiple
        hidden
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.currentTarget.files || [])
          if(files.length>0) {
            const complaint = selectedIndex != undefined ? complaints[selectedIndex] : undefined
            onFiles(complaint, files)
          }
          e.currentTarget.value = ""
        }} />
      <Box position="relative" sx={{ width: '100%' }}>
        {!hideUpload && <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => {
            onPrepareUpload?.()
            inputRef.current?.click()
          }}
          sx={{ width: "100%", minHeight: 48, mb: 1, textTransform: "none", fontWeight: 700 }}
        >
          Add photos or video
        </Button>}
        {showCaption && <Typography variant="subtitle2" sx={{ px: .5, pb: .5, fontWeight: 700 }}>
          Choose violation type
        </Typography>}
        {/* First 4 Items */}
        <Box
          sx={{
            top: 0,
            left: 0,
            width: '100%',
            padding: .5,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 1,
          }}
          onDrop={() => {
            setHoveredIndex(undefined)
          }}
          onDragLeave={() => {
            setHoveredIndex(undefined)
          }}
        >
          {complaints.map((item, index) => {
            const isSelected = selectedIndex === index
            let filter = undefined
            if (isSelected) {
              filter = undefined
            } else if (hoveredIndex != undefined && hoveredIndex != index) {
              filter = "grayscale(100%)"
            }
            return (
              <Paper
                elevation={3}
                key={item.type + "_" + index}
                role="button"
                tabIndex={0}
                aria-label={item.type}
                aria-pressed={isSelected}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault()
                  setHoveredIndex(index)
                }}
                onDragEnd={()=> {
                  setHoveredIndex(undefined)
                }}
                onDragEnter={(e: DragEvent) => {
                  // console.log("drag enter")
                  setHoveredIndex(index)
                  e.preventDefault()
                }}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                  handleDrop(onFiles, item, e)
                  setHoveredIndex(undefined)
                }}
                onMouseEnter={(e) => {
                  setHoveredIndex(index)
                }}
                onClick={() => {
                  handleSelect(index)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    handleSelect(index)
                  }
                }}
                onMouseLeave={(e) => {
                  // console.log("mouse leave")
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setHoveredIndex(undefined)
                  }
                  e.preventDefault()
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                }}
                sx={{
                  overflow: 'hidden',
                  width: '100%',
                  aspectRatio: '1/1',
                  position: "relative",
                  boxSizing: "border-box",
                  borderRadius: 1,
                  border: isSelected ? "3px solid #15803d" : "1px solid rgba(15, 23, 42, 0.14)",
                  bgcolor: isSelected ? "#f0fdf4" : "background.paper",
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(21, 128, 61, 0.16), 0 4px 12px rgba(15, 23, 42, 0.12)"
                    : undefined,
                  cursor: "pointer",
                  transition: "border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease",
                  "&:focus-visible": {
                    outline: "3px solid rgba(15, 111, 178, 0.35)",
                    outlineOffset: 2,
                  },
                }}
              >
                <ComplaintView hoveredIndex={hoveredIndex} notHovered={index != hoveredIndex} complaint={item} index={index} size={complaints.length} />
                {isSelected && <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    zIndex: 4,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: "#15803d",
                    color: "#fff",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: 0,
                  }}
                >
                  <CheckIcon sx={{ fontSize: 17 }} />
                  Selected
                </Box>}
              </Paper>
            )
          })}
        </Box>
      </Box>
      {showCaption && <Typography variant="body1" sx={{ fontWeight: 600, textAlign: "center", visibility: display }}>{tooltip}</Typography>}
      {showCaption && <Typography sx={{ top: 0, fontSize: ".75rem", paddingLeft: ".2rem", paddingRight: ".2rem" }}>Left-to-Right and Top-to-Bottom: <u>Blocked bike lane</u>, <u>crosswalk</u>, <u>ran red light</u>, <u>drove recklessly</u>, <u>illegal parking</u>.</Typography>}
    </Box>
  );
}

export const LottiePlayer = ({ complaint, width, forcePlay }: ComplaintProps) => {
  const goTo = forcePlay ? undefined : (complaint.lottieFrame || 0)
  return (<Box
    key={complaint.type}
    sx={{
      flex: `0 0 calc(${width || "31%"})`, // 50% width
      width: width,
      height: "100%",
      overflow: "hidden",
      position: "relative",
      borderRadius: "inherit",
      objectFit: "cover", objectPosition: "center",
      cursor: "pointer"
      // filter: "grayscale(100%)"
    }}>
    <Lottie
      rendererSettings={{
        preserveAspectRatio: "xMidYMid slice",
      }}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
      goTo={goTo}
      play={!!forcePlay}
      loop={true}      
      speed={complaint.lottieSpeed || 1}
      animationData={complaint.src}
    />
  </Box>)
}
