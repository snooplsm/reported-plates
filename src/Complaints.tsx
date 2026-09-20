import { Box, Button, Paper, Typography } from "@mui/material"
import { useEffect, useRef, useState } from "react";
// import Lottie, { LottieRef, LottieRefCurrentProps } from 'lottie-react';
import Lottie from 'react-lottie-player'
import bikeLane from "./lottie/bikelane.json"
import crosswalk from "./lottie/crosswalk.json"
import ranRedLight from "./lottie/ranredlight.json"
import reckless from "./lottie/reckless.json"
import parkedIllegally from "./lottie/parkedillegally.json"
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckIcon from '@mui/icons-material/Check';
import { Steps } from "./HowToGuide";
import { REPORT_FILE_ACCEPT } from "./api/file-utils";

export interface Complaint {
  type: ComplaintType;
  media: MediaType;
  src: string | object;
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

const complaintLabels: Record<ComplaintType, string> = {
  [ComplaintType.BlockedBikeLane]: 'Blocked bike lane',
  [ComplaintType.BlockedCrosswalk]: 'Blocked crosswalk',
  [ComplaintType.RanRedLight]: 'Red light / stop sign',
  [ComplaintType.ParkedIllegally]: 'Parked illegally',
  [ComplaintType.DroveRecklessly]: 'Drove recklessly'
}

export const complaints: Complaint[] = [
  {
    type: ComplaintType.BlockedBikeLane,
    media: MediaType.Lottie,
    src: bikeLane
  },
  {
    type: ComplaintType.BlockedCrosswalk,
    media: MediaType.Lottie,
    src: crosswalk
  },
  {
    type: ComplaintType.RanRedLight,
    media: MediaType.Lottie,
    src: ranRedLight,
    lottieFrame: 20
  },
  {
    type: ComplaintType.DroveRecklessly,
    media: MediaType.Lottie,
    src: reckless,
    lottieFrame: 48
  },
  {
    type: ComplaintType.ParkedIllegally,
    media: MediaType.Lottie,
    lottieFrame: 50,
    src: parkedIllegally
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
  dragDropMode?: boolean
}

export const ComplaintsView = ({ onFiles, onPrepareUpload, step, selectedComplaint, onChange, hideUpload=false, dragDropMode=false, hoveredStep, showCaption }: ComplaintsProps) => {

  const inputRef = useRef<HTMLInputElement>()

  const [hoveredIndex, setHoveredIndex] = useState<number | undefined>()
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | undefined>()

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
            setDraggedOverIndex(undefined)
          }}
          onDragLeave={(event) => {
            const nextTarget = event.relatedTarget as Node | null
            if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
              setHoveredIndex(undefined)
              setDraggedOverIndex(undefined)
            }
          }}
        >
          {complaints.map((item, index) => {
            const isSelected = selectedIndex === index
            const isDragTarget = dragDropMode && draggedOverIndex === index
            const isAnotherDragTarget = dragDropMode && draggedOverIndex !== undefined && !isDragTarget
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
                  e.dataTransfer.dropEffect = "copy"
                  setHoveredIndex(index)
                  setDraggedOverIndex(index)
                }}
                onDragEnd={()=> {
                  setHoveredIndex(undefined)
                  setDraggedOverIndex(undefined)
                }}
                onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
                  setHoveredIndex(index)
                  setDraggedOverIndex(index)
                  e.preventDefault()
                }}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                  handleDrop(onFiles, item, e)
                  setHoveredIndex(undefined)
                  setDraggedOverIndex(undefined)
                }}
                onMouseEnter={() => {
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
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setHoveredIndex(undefined)
                  }
                  e.preventDefault()
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  const nextTarget = e.relatedTarget as Node | null
                  if (!nextTarget || !e.currentTarget.contains(nextTarget)) {
                    setHoveredIndex(undefined)
                    setDraggedOverIndex(undefined)
                  }
                }}
                sx={{
                  overflow: 'hidden',
                  width: '100%',
                  aspectRatio: '1/1',
                  position: "relative",
                  boxSizing: "border-box",
                  borderRadius: 1,
                  border: isDragTarget
                    ? "3px dashed #0f6fb2"
                    : isSelected
                      ? "3px solid #15803d"
                      : "1px solid rgba(15, 23, 42, 0.14)",
                  bgcolor: isDragTarget ? "#e0f2fe" : isSelected ? "#f0fdf4" : "background.paper",
                  boxShadow: isDragTarget
                    ? "0 0 0 4px rgba(15, 111, 178, 0.2), 0 14px 30px rgba(15, 23, 42, 0.22)"
                    : isSelected
                      ? "0 0 0 2px rgba(21, 128, 61, 0.16), 0 4px 12px rgba(15, 23, 42, 0.12)"
                      : undefined,
                  opacity: isAnotherDragTarget ? 0.58 : 1,
                  transform: isDragTarget ? "translateY(-3px) scale(1.015)" : "none",
                  zIndex: isDragTarget ? 2 : 1,
                  cursor: "pointer",
                  transition: "border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease, opacity 140ms ease, transform 140ms ease",
                  "&:focus-visible": {
                    outline: "3px solid rgba(15, 111, 178, 0.35)",
                    outlineOffset: 2,
                  },
                }}
              >
                <ComplaintView hoveredIndex={hoveredIndex} notHovered={index != hoveredIndex} complaint={item} index={index} size={complaints.length} />
                {dragDropMode ? <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    zIndex: 4,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    minHeight: 36,
                    px: 0.75,
                    py: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: isDragTarget
                      ? "#0f6fb2"
                      : isSelected
                        ? "#15803d"
                        : "rgba(15, 23, 42, 0.82)",
                    color: "#fff",
                    textAlign: "center",
                    backdropFilter: "blur(3px)",
                  }}
                >
                  {isSelected && <CheckIcon sx={{ fontSize: 16, flexShrink: 0 }} />}
                  <Box>
                    <Typography
                      component="span"
                      sx={{
                        display: "-webkit-box",
                        overflow: "hidden",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        fontSize: "clamp(0.62rem, 1.8vw, 0.78rem)",
                        fontWeight: 800,
                        lineHeight: 1.08,
                      }}
                    >
                      {complaintLabels[item.type]}
                    </Typography>
                    {isDragTarget && <Typography component="span" sx={{ display: "block", mt: 0.25, fontSize: "0.6rem", fontWeight: 700, lineHeight: 1 }}>
                      Drop photo
                    </Typography>}
                  </Box>
                </Box> : isSelected && <Box
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
                    bgcolor: "#15803d",
                    color: "#fff",
                  }}
                >
                  <CheckIcon sx={{ fontSize: 17 }} />
                </Box>}
              </Paper>
            )
          })}
        </Box>
      </Box>
    </Box>
  );
}

export const LottiePlayer = ({ complaint, width }: ComplaintProps) => {
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden)
    document.addEventListener("visibilitychange", updateVisibility)
    updateVisibility()
    return () => document.removeEventListener("visibilitychange", updateVisibility)
  }, [])

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
      play={pageVisible}
      loop={true}      
      speed={complaint.lottieSpeed || 1}
      animationData={complaint.src}
    />
  </Box>)
}
