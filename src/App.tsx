import { useRef, useState } from 'react'
import './App.css'
import cv from "@techstark/opencv-js";
import * as ExifReader from 'exifreader';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import { DetectBox, downloadAll, PlateDetection, segment } from './api/segment';
import Box from '@mui/material/Box';
import PhotoAlbumIcon from "@mui/icons-material/PhotoLibrary";
import { CssBaseline, Icon, ThemeProvider, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import theme from './theme';
import DetectView from './DetectView';
import { Feature, fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import { Complaint, ComplaintsView } from './Complaints';
import ranRedLight from "./ranredlight.json"
import Lottie from 'lottie-react';
import { DetectionView } from './DetectionView';
import FileUploadPreview from './FileUploadPreview';
import HowToGuide from './HowToGuide';

function App() {

  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: NaN });

  const [files, setFiles] = useState<File[]>()

  const [boxes, setBoxes] = useState<DetectBox[]>()

  const [location, setLocation] = useState<GeoSearchResponse>()

  const [feature, setFeature] = useState<Feature>()

  const [latLng, setLatLng] = useState<Number[]>()

  const [dateOfIncident, setDateOfIncident] = useState<Date>()

  const [loaded, setLoaded] = useState(false)

  const [isDragging, setIsDragging] = useState(false);

  const [dragComponent, setDragComponent] = useState<HTMLElement>()

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPlate = (plate: PlateDetection) => { }

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

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle file drop event
  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false)
    const dropTarget = (e.target as HTMLElement).closest('[data-value]') as HTMLElement | null;
    if (dropTarget) {
      const value = dropTarget.getAttribute('data-value');
      setSelected(value)
      console.log('Dropped on:', value);
    }
    // e.stopPropagation();
    const file = e.dataTransfer.files[0]; // Get the first dropped file
    if (file) {
      handleFileChange(e);
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

  const onFiles = (complaint:Complaint, files:File[]) => {
    setFiles(files)
  }

  const handleFiles = async (filelist: FileList | null) => {
    if (filelist == null) {
      return
    }

    const files = Array.from(filelist || [])
    if (files.length > 0) {
      setFiles(files)
    } else {
      setFiles(undefined)
    }
    const file = files[0]
    const seg = await segment(file)
    if (seg) {
      setBoxes(seg)
    }
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLInputElement>) => {
    let files: FileList | null = null;

    if ("dataTransfer" in e) {
      // Handle drag-and-drop event
      files = e.dataTransfer.files;
    } else {
      // Handle input file change event
      files = e.currentTarget.files;
    }
    handleFiles(files)
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
          <ComplaintsView onFiles={onFiles} />
          <Box sx={{
            position: "relative",
            maxHeight: "80px",
            height: "auto",
            width: "100%"
          }}>
          {files?.map(x=> {
            return <FileUploadPreview file={x}/>
          })}
          </Box>
          {/* <DetectionView /> */}
        </Box>
        {/* Right Column */}
        <Box
          flex={1}
          display="flex"
        >
          <HowToGuide videoUrl='video/howto1.mp4'/>
          {files && files[0] && <DetectView file={files[0]}/>}
        </Box>
      </Box>
    </ThemeProvider>
  )
}



export default App
