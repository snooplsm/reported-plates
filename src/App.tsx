import { useRef, useState } from 'react'
import './App.css'
import cv from "@techstark/opencv-js";
import * as ExifReader from 'exifreader';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import { DetectBox, downloadAll, PlateDetection, segment } from './api/segment';
import Box from '@mui/material/Box';
import { Button, CssBaseline, Icon, Input, Paper, Portal, ThemeProvider, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import theme from './theme';
import DetectView from './DetectView';
import { Feature, fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import { Complaint, ComplaintsView } from './Complaints';
import ranRedLight from "./ranredlight.json"
import Lottie from 'lottie-react';
import { DetectionView } from './DetectionView';
import FileUploadPreview from './FileUploadPreview';
import SendIcon from '@mui/icons-material/Send';
import HowToGuide, { Steps } from './HowToGuide';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import { BasicDateTimePicker } from './BasicDateTimePicker';


function App() {

  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: NaN });

  const [files, setFiles] = useState<File[]>()

  const [boxes, setBoxes] = useState<DetectBox[]>()

  const [location, setLocation] = useState<GeoSearchResponse>()

  const [feature, setFeature] = useState<Feature>()

  const [latLng, setLatLng] = useState<Number[]>()

  const [hoveredStep, setHoveredStep] = useState<Steps | undefined>()

  const [dateOfIncident, setDateOfIncident] = useState<Date>()

  const [loaded, setLoaded] = useState(false)

  const [isDragging, setIsDragging] = useState(false);

  const [dragComponent, setDragComponent] = useState<HTMLElement>()

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPlate = (plate: PlateDetection) => { }

  const [plate, setPlate] = useState<PlateDetection>()
  const [results, setResults] = useState<DetectBox[]>()
  const [car, setCar] = useState<DetectBox>()

  type MediaType = 'blockedbikelane' | 'blockedcrosswalk' | 'ranredlight' | 'parkedillegally' | 'droverecklessly' | null;
  const [selected, setSelected] = useState<MediaType>(null);

  const handleSelection = (
    event: React.MouseEvent<HTMLElement>,
    newSelection: MediaType
  ) => {
    setSelected(newSelection);
  };

  const onLocationChange = (resp: GeoSearchResponse, feature: Feature) => {
    setLatLng(feature.geometry.coordinates)
    resp.features = [feature]
    setLocation(resp)
    setFeature(feature)
  }

  // Handle drag over event (to allow dropping)
  const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(true);
    if (e.target.value) {
      setSelected(e.target.value)
    }
  };

  let initialized = false

  cv["onRuntimeInitialized"] = async () => {
    console.log("initialized")
    if (!initialized) {
      initialized = true
    }
    await downloadAll(setLoading)
    setLoaded(true)
  }

  // const handleFilesChange = async (e: React.DragEvent<HTMLInputElement>) => {
  //   handleFiles(e.currentTarget.files)
  // }

  const onFiles = async (complaint?: Complaint, files: File[]) => {
    setFiles(files)

    const exifGetter = async (file: File) => {
      const hash = await getFileHash(file)
      console.log("hash", hash)
      const tags = await ExifReader.load(file);
      console.log(tags)
      const unprocessedTagValue = tags['DateTimeOriginal']?.value;
      const offsetTime = tags['OffsetTime']?.value
      if (offsetTime && unprocessedTagValue) {
        const dateWithZone = `${unprocessedTagValue}${offsetTime}`.replace(/^(\d{4}):(\d{2}):/, '$1-$2-').replace(' ', 'T');
        const dateTime = new Date(dateWithZone)
        console.log(dateTime)
        setDateOfIncident(dateTime)
      } else if (unprocessedTagValue) {

      }
      const latitude =
        tags['GPSLatitudeRef']?.description?.toLowerCase() === 'south latitude'
          ? -Math.abs(parseFloat(tags['GPSLatitude']?.description || '0'))
          : parseFloat(tags['GPSLatitude']?.description || '0');

      const longitude =
        tags['GPSLongitudeRef']?.description?.toLowerCase() === 'west longitude'
          ? -Math.abs(parseFloat(tags['GPSLongitude']?.description || '0'))
          : parseFloat(tags['GPSLongitude']?.description || '0');

      console.log(unprocessedTagValue, latitude, longitude)
      const cachedGeo = reported.get<GeoSearchResponse>(ReportedKeys.Geo, hash)
      const data = cachedGeo ? cachedGeo : await fetchGeoData(latitude, longitude);
      if (data && data?.features?.[0]?.properties?.label?.length > 0) {
        reported.set(ReportedKeys.Geo, data, hash)
        setLocation(data)
        setFeature(data.features[0])
        setLatLng([latitude, longitude])
      }
    }

    for (const file of files) {
      if (plate) {
        break
      }
      segment(file)
        .then(result => {
          console.log("segmented file")
          result
          if (result) {
            const carWithPlates = result.filter(res => res.plate != null)
            setResults(carWithPlates)
            setBoxes(carWithPlates)
            if (carWithPlates && carWithPlates[0]) {
              const carWithPlate = carWithPlates[0]
              if (!car) {
                setCar(carWithPlate)
                setPlate(carWithPlate.plate!)
              }
            }
          }
        }).catch(error => {
          console.log(error)
        })
      exifGetter(file).then(ok => {

      })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLInputElement>) => {
    let files: FileList | null = null;

    if ("dataTransfer" in e) {
      // Handle drag-and-drop event
      files = e.dataTransfer.files;
    } else {
      // Handle input file change event
      files = e.currentTarget.files;
    }
    onFiles(undefined, Array.from(files!))
  }
  return (

    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        display="flex"
        maxWidth={"1280px"}
        height="100vh"
      >
        {/* Left Column */}
        <Box
          flex="0 0 20%"
          display="flex"
          flexDirection="column"
          justifyContent="start"
        >
          <ComplaintsView step={Steps.DRAG_PHOTO_OR_UPLOAD} hoveredStep={hoveredStep} onFiles={onFiles} />
          <Box sx={{
            position: "relative",
            maxHeight: "80px",
            height: "auto",
            width: "100%"
          }}>
            {files?.map(x => {
              return <FileUploadPreview file={x} />
            })}
          </Box>
          <DetectionView plate={plate} />
          <BasicDateTimePicker onChange={(value) => {
            setDateOfIncident(value)
          }} value={dateOfIncident} />
          <Box sx={{
            position: "absolute",
            bottom: 0,
          }}>
            <Button
              sx={{
                width: "100%",
                margin: 2
              }}
              size='large'
              // onClick={handleClick}
              endIcon={<SendIcon />}
              loading={loading}
              loadingPosition="end"
              variant="contained"
            >
              Submit Complaint
            </Button>
          </Box>
          <Input aria-label="Description" multiline placeholder="Type something…" />
        </Box>
        {/* Right Column */}
        <Box
          flex={1}
          display="flex"
        >
          {(!files || !files[0]) &&
            <HowToGuide onStepHovered={(step) => {
              setHoveredStep(step)
            }} videoUrl='video/howto1.mp4' />}
          {files && files[0] && <DetectView file={files[0]} />}
        </Box>
      </Box>
    </ThemeProvider>
  )
}



export default App
