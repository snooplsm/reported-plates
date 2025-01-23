import { Box, Paper, Tooltip, Typography } from "@mui/material"
import { useEffect, useRef, useState } from "react";
// import Lottie, { LottieRef, LottieRefCurrentProps } from 'lottie-react';
import Lottie from 'react-lottie-player'
import ranRedLight from "./lottie/ranredlight.json"
import reckless from "./lottie/reckless.json"
import noParking from "./lottie/parkedillegally.json"
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Steps } from "./HowToGuide";
import TextFit from "react-textfit"

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

  const media = () => {
    const media = complaint.media
    const even = index % 2 == 0
    if (media == MediaType.Image) {
      return (
        <Box component="img" key={complaint.type} src={complaint.src} sx={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: "center",

          transition: "transform   0.1s ease", // Smooth hover effect
          "&:hover": {
            transform: "scale(1.2)", // Scale image on hover        
            cursor: "pointer"
          }
        }} />
      )
    } else if (media == MediaType.Lottie) {
      return (
        <LottiePlayer forcePlay={index == hoveredIndex} complaint={complaint} notHovered={notHovered} index={index} size={size} />
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
  step?: Steps,
  hoveredStep?: Steps | undefined
  showCaption?: boolean,
  selectedComplaint?: Complaint
  onChange: (complaint?: Complaint) => void
}

export const ComplaintsView = ({ onFiles, step, selectedComplaint, onChange, hoveredStep, showCaption }: ComplaintsProps) => {

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
        accept="image/jpeg, image/heic"
        type="file"
        hidden
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.currentTarget.files || [])
          if(files.length>0) {
            const complaint = (selectedIndex && complaints[selectedIndex]) || undefined
            onFiles(complaint, files)
          }
        }} />
      <Box position="relative" sx={{ width: '100%' }}>
        {/* First 4 Items */}
        <Box
          sx={{
            top: 0,
            left: 0,
            width: '100%',
            gap: "2%",
            padding: .5,
            display: 'flex',
            whiteSpace: 'nowrap',
            flexWrap: 'wrap', // Allows items to wrap to the next row
          }}
        >
          {complaints.map((item, index) => {
            let filter = undefined
            if (selectedIndex == index) {
              filter = undefined
            } else if (hoveredIndex != undefined && hoveredIndex != index) {
              filter = "grayscale(100%)"
            }
            return (
              <Paper
                elevation={3}
                key={item.type + "_" + index}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault()
                }}
                onDragEnter={(e: DragEvent) => {
                  // console.log("drag enter")
                  setHoveredIndex(index)
                  e.preventDefault()
                }}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                  handleDrop(onFiles, item, e)
                }}
                onMouseEnter={(e) => {
                  setHoveredIndex(index)
                }}
                onClick={() => {
                  handleSelect(index)
                  inputRef.current.click()                  
                }}
                onMouseLeave={(e) => {
                  // console.log("mouse leave")
                  setHoveredIndex(undefined)
                  e.preventDefault()
                }}
                onDragLeave={(e) => {
                  setHoveredIndex(undefined)
                  e.preventDefault()
                }}
                sx={{
                  overflow: 'hidden',
                  flex: '0 0 calc(31%)', // 50% width
                  width: '31%',
                  borderRadius: 4,
                  marginBottom: "2%",
                  filter: undefined,
                }}
              ><ComplaintView hoveredIndex={hoveredIndex} notHovered={index != hoveredIndex} complaint={item} index={index} size={complaints.length} /></Paper>
            )
          })}
          <Paper
            elevation={3}
            onClick={()=> {
              inputRef.current?.click()
            }}
            sx={{
              width: "31%",
              backgroundColor: "yellow",
              borderRadius: 4,
              marginBottom: "2%",
              overflow: "hidden",
              display: "flex",
              flex: `0 0 calc("31%"})`, // 50% width
              flexDirection: "column"
            }}
          >
            <Box sx={{
              position: "absolute",
              paddingLeft: "2%",
              paddingTop: "1%",
              cursor: "pointer"
            }}

            >
              <CloudUploadIcon sx={{
                width: "22%",
                height: "22%",
                justifyContent: "top",
                position: "relative", // Centers icon horizontally in its flex container
                top: 0,
                left: 0,
              }} />
            </Box>
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                fontSize: ".5rem",
                alignItems: "center", // Centers text vertically
                justifyContent: "center", // Centers text horizontally
                textAlign: "center",
                textWrap: "wrap",
                cursor: "pointer"
              }}
            >
              upload <br />or<br />drag & drop<br />jpeg, heic
            </Box>
          </Paper>
        </Box>
      </Box>
      {showCaption && <Typography variant="body1" sx={{ fontWeight: 600, textAlign: "center", visibility: display }}>{tooltip}</Typography>}
      {showCaption && <Typography sx={{ top: 0, fontSize: ".75rem", paddingLeft: ".2rem", paddingRight: ".2rem" }}>Left-to-Right and Top-to-Bottom: <u>Blocked bike lane</u>, <u>crosswalk</u>, <u>ran red light</u>, <u>drove recklessly</u>, <u>illegal parking</u>.</Typography>}
    </Box>
  );
}

export const LottiePlayer = ({ complaint, width, forcePlay }: ComplaintProps) => {

  const [ready, setReady] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [goTo, setGoTo] = useState<number>()

  const [options, setOptions] = useState<any>()

  const playPause = (play: boolean) => {
    if (play) {
      setAutoPlay(true)
      setGoTo(undefined)
    } else if (!play) {
      setGoTo(complaint.lottieFrame)
      setAutoPlay(false)
    }
  }

  useEffect(() => {
    setGoTo(complaint.lottieFrame)
  }, [])

  return (<Box
    key={complaint.type}
    onMouseOver={(e) => {
      playPause(true)
      e.preventDefault()
    }}
    onMouseLeave={(e) => {
      playPause(false)
      e.preventDefault()
    }

    }
    sx={{
      flex: `0 0 calc(${width || "31%"})`, // 50% width
      width: width, overflow: "hidden",
      objectFit: "cover", objectPosition: "center",
      cursor: "pointer"
      // filter: "grayscale(100%)"
    }}>
    <Lottie
      goTo={complaint.lottieFrame || 0}
      play={forcePlay || autoPlay}
      loop={true}      
      speed={complaint.lottieSpeed || 1}
      animationData={complaint.src}
    />
  </Box>)
}