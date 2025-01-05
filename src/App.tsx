import { useRef, useState } from 'react'
import logo from './assets/reported.svg'
import './App.css'
import cv from "@techstark/opencv-js";
import * as ExifReader from 'exifreader';
import { fetchGeoData, GeoSearchResponse } from './api/nyc';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import { DetectBox, downloadAll, segment } from './api/segment';
import Box from '@mui/material/Box';
import PhotoAlbumIcon from "@mui/icons-material/PhotoLibrary";
import { CssBaseline, Icon, ThemeProvider, Typography} from "@mui/material";
import theme from './theme';
import DetectView from './DetectView';

function App() {

  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: NaN });

  const [files, setFiles] = useState<File[]>()

  const [boxes, setBoxes] = useState<DetectBox[]>()

  const [location, setLocation] = useState<GeoSearchResponse>()

  const [dateOfIncident, setDateOfIncident] = useState<Date>()

  const [loaded, setLoaded] = useState(false)

  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag over event (to allow dropping)
  const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle file drop event
  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false)
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
    if(seg) {
      setBoxes(seg)
    }
    const hash = await getFileHash(file)
    console.log("hash", hash)
    const tags = await ExifReader.load(file);
    console.log(tags)
    const unprocessedTagValue = tags['DateTimeOriginal']?.value;
    const offsetTime = tags['OffsetTime']?.value
    if(offsetTime && unprocessedTagValue) {
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
      <div
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2, // Space between the image and the text
          }}
        >

          <Box
            component="img"
            src={logo}
            sx={{
              width: 40, // Set width for the image
              height: 40, // Set height for the image
              objectFit: "contain", // Ensure the image is fully visible
            }}
          />      <Typography variant="h1" sx={{ fontSize: "2rem", fontWeight: "bold" }}>
            Reported
          </Typography>
        </Box>

        {!loaded && <div className="card">
          <p>
            <>Loaded: {!Number.isNaN(loading.progress) && loading.progress}%<br /></>
          </p>
        </div>}
        {loaded && <br/>}
        <Box onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          component="section"
          sx={{
            transition: "background-color 0.2s ease",
            cursor: "pointer",
            backgroundColor: isDragging ? "primary.light" : "background.default",
            p: 2, border: '1px dashed grey', padding: '2em'
          }}>
          <Box>Drag and Drop photos here or <u><a onClick={() => {
            fileInputRef.current?.click()
          }} href="#">Choose here</a></u>
            <input ref={fileInputRef} hidden accept=".jpg, .png, .heif, .heic" type="file" onChange={handleFileChange} />.
          </Box>
          <Box sx={{ padding: '1em' }}></Box>
          <Box sx={{ textAlign: 'left', paddingLeft: '.4em', paddingBottom: '.2em' }}>
            <Typography sx={{ fontWeight: "500" }}>Supported Formats</Typography></Box>


          <Box sx={{ p: 2, padding: '2em', border: '1px dashed grey', borderRadius: "16px 0 16px 0", textAlign: 'left' }}>

            <Box>
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}><Icon sx={{ paddingBottom: '2.1rem',color: theme.palette.gunmetal.main }}  aria-label="gallery">
                  <PhotoAlbumIcon sx={{ fontSize: 16 }} />
                </Icon>
                <Typography sx={{
                  fontSize: '.875rem',
                  fontWeight: 500,
                  color: theme.palette.gunmetal.main,
                  lineHeight: "1.25rem"
                }}>
                  Images
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    gap: ".5rem",
                    fontSize: '.75rem',
                    fontWeight: 400,
                    lineHeight: "1rem",
                    color: theme.palette.gray.main,
                    font: "SF Mono, monospace"
                  }}>.jpg, .heic</Typography>
              </Box>
            </Box>
          </Box>
        </Box><br />
        {files && files.map((file,index) => <DetectView key={index.toString()} file={file} boxes={boxes} />)}<br/>
        {dateOfIncident?.toString()}<br/>
        {location?.features[0].properties.label}
      </div>
    </ThemeProvider>
  )
}

export default App
