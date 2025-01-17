import { useEffect, useRef, useState } from 'react'
import './App.css'
import cv from "@techstark/opencv-js";
import * as ExifReader from 'exifreader';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import { DetectBox, downloadAll, PlateDetection, segment } from './api/segment';
import Box from '@mui/material/Box';
import { Button, CssBaseline, Icon, Input, ThemeProvider, Paper, Portal, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import theme from './theme';
import DetectView from './DetectView';
import { Feature, fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import { Complaint, ComplaintsView, ComplaintType } from './Complaints';
import { UserView } from './UserView'
import { DetectionView } from './DetectionView';
import FileUploadPreview from './FileUploadPreview';
import SendIcon from '@mui/icons-material/Send';
import HowToGuide, { Steps } from './HowToGuide';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import { BasicDateTimePicker } from './BasicDateTimePicker';
import { MapPickerView } from './MapPickerView';
import { JwtPayload } from 'jwt-decode';
import LoginModal from './LoginModal';
import { isLoggedIn, login, Report, ReportErrors, ReportError, submitReport, userLogin, userLogout } from './Auth';
import TextArea from './TextArea';


function App() {

  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: NaN });

  const [submitting, setSubmitting] = useState(false)

  const [files, setFiles] = useState(new Set<File>())
  const [currentFile, setCurrentFile] = useState<number>()
  const [fileNames] = useState<Set<string>>(new Set())

  const [complaint, setComplaint] = useState<Complaint>()

  const [boxes, setBoxes] = useState<DetectBox[]>()

  const [location, setLocation] = useState<GeoSearchResponse>()

  const [feature, setFeature] = useState<Feature>()

  const [latLng, setLatLng] = useState<Number[]>()

  const [hoveredStep, setHoveredStep] = useState<Steps | undefined>()

  const [showLoginModal, setShowLoginModal] = useState<[string, JwtPayload]>()

  const [isSignedIn, setIsSignedIn] = useState(false)

  const [dateOfIncident, setDateOfIncident] = useState<Date>()

  const [loaded, setLoaded] = useState(false)

  const [isDragging, setIsDragging] = useState(false);

  const [dragComponent, setDragComponent] = useState<HTMLElement>()

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(()=> {
    const loginSub = userLogin.subscribe(()=> {
      setIsSignedIn(true)
    })
    const logoutSub = userLogout.subscribe(()=> {
      setIsSignedIn(false)
    })
    return () => {
      loginSub.unsubscribe()
      logoutSub.unsubscribe()
    }
  },[])

  const onPlate = (plates: PlateDetection) => { 
    if(!plate) {
      setPlate(plates)
    }
    if(plate) {
      plate.state = plates.state
      plate.text = plates.text
      plate.plateOverride = plates.plateOverride
      plate.tlc = plates.tlc
      plate.box = plates.box
      plate.image = plates.image
      plate.nypd = plates.nypd
      plate.textLetterProb = plates.textLetterProb
      plate.textWithUnderscores = plates.textWithUnderscores
      plate.stateConfidence = plates.stateConfidence
      setPlate(plate)
    }

  }

  const [plate, setPlate] = useState<PlateDetection>()
  const [results, setResults] = useState<DetectBox[]>()
  const [car, setCar] = useState<DetectBox>()

  const [reportDescription, setReportDescription] = useState<string>('')

  type MediaType = 'blockedbikelane' | 'blockedcrosswalk' | 'ranredlight' | 'parkedillegally' | 'droverecklessly' | null;
  const [selected, setSelected] = useState<MediaType>(null);

  useEffect(() => {
    const signedIn = async () => {
      const user = await isLoggedIn()
      setIsSignedIn(user != undefined)
    }
    signedIn()
  }, [])

  const handleSuccess = (credentialResponse: any) => {
    // Handle the successful login here
    console.log('Google login successful', credentialResponse);
    login(credentialResponse, (accessToken: string, jwt: JwtPayload) => {
      setShowLoginModal([accessToken, jwt])
    })
      .then(resp => {
        setIsSignedIn(true)
      }).catch(e => {
        console.log(e)
      })
  };

  const handleError = () => {
    // Handle login errors here
    console.log('Google login failed');
  };

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

  const onFiles = async (complaint?: Complaint, filez?: File[]) => {
    if (filez) {
      const newFiles = new Set<File>(files)
      filez.forEach(file=> {
        if(!fileNames.has(file.name)) {
          newFiles.add(file)
        }
      })
      setFiles(newFiles)
      if(currentFile == undefined) {
        setCurrentFile(0)
      }
    }
    if(complaint) {
      setComplaint(complaint)
    }

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

    for (const file of (filez || [])) {
      if (plate?.image) {
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

  return (

    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        display="flex"
        height="100vh"
      >
        {/* Left Column */}
        <Box
          flex="0 0 20%"
          display="flex"
          flexDirection="column"
          justifyContent="start"
          sx={{
            // overflowY: "auto"
          }}
        >
          <UserView isSignedIn={isSignedIn} handleSuccess={handleSuccess} handleError={handleError} />
          <ComplaintsView showCaption={true} step={Steps.DRAG_PHOTO_OR_UPLOAD} hoveredStep={hoveredStep} onFiles={onFiles} selectedComplaint={complaint} onChange={setComplaint} />
          <Box sx={{
            position: "relative",
            maxHeight: "80px",
            height: "auto",
            width: "100%",
            overflow: "hidden"
          }}>
            {[...(files||[])].map((x,index) => {
              return <FileUploadPreview onClick={()=>{              
                setCurrentFile(index)}} file={x} />
            })}
          </Box>
          <DetectionView onPlateChange={onPlate} plate={plate} />

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
              onClick={() => {
                
                const err:ReportErrors[] = []
                let license:string | undefined
                let state:string | undefined
                if(!plate) {
                  err.push(ReportErrors.MISSING_PLATE)
                } else {
                  license = plate?.plateOverride?.trim() ? plate.plateOverride : plate?.text
                  if(!license) {
                    err.push(ReportErrors.MISSING_PLATE)
                  }
                  
                  state = plate?.state
                  if(!state) {
                    err.push(ReportErrors.MISSING_PLATE_STATE)
                  }
                }
                
                const fileZ = files
                if((!fileZ || (files.size || 0) < 1)) {
                  err.push(ReportErrors.NO_PHOTOS)
                }

                const timeofreport = dateOfIncident
                if(!timeofreport) {
                  err.push(ReportErrors.MISSING_DATE)
                }

                const addy = location?.features[0]
                
                if(!addy) {
                  err.push(ReportErrors.MISSING_ADDRESS)
                }

              
                const latLng = location?.features[0].geometry
                if(!latLng) {
                  err.push(ReportErrors.MISSING_ADDRESS)
                }

                const _complaint = complaint

                if(!_complaint) {
                  err.push(ReportErrors.MISSING_COMPLAINT)
                }

                if(err.length>0) {
                  throw ReportError(err)
                }

                const report:Report = {
                  license: license!,
                  state: state!,
                  files: [...fileZ]!,
                  timeofreport: timeofreport!,
                  address: addy!,
                  reportDescription: '',
                  testify: true,
                  passenger: false,
                  typeofcomplaint: complaint?.type!
                }
                console.log(report)
                setSubmitting(true)
                submitReport(report)
                .then(result=> {
                  setSubmitting(false)
                  console.log("success", result)
                }).catch(error=> {
                  setSubmitting(false)
                  console.log(error)
                })
              }}
              endIcon={<SendIcon />}
              loading={submitting}
              loadingPosition="end"
              variant="contained"
            >
              Submit Complaint
            </Button>
          </Box>
        </Box>
        {/* Right Column */}
        <Box
          flex="0 0 50%"
          display="flex"
        >
          {(currentFile==undefined) &&
            <HowToGuide onStepHovered={(step) => {
              setHoveredStep(step)
            }} handleError={handleError} isSignedIn={isSignedIn} handleSuccess={handleSuccess} videoUrl='video/howto1.mp4' />}
          {currentFile && <DetectView file={[...files][currentFile]} />}
        </Box>
        <Box flex="1" sx={{
          marginTop: 1,
          marginRight: 1,
        }}>
          <MapPickerView latLng={latLng} location={location} />
          <BasicDateTimePicker onChange={(value) => {
            setDateOfIncident(value)
          }} value={dateOfIncident} />

          <TextArea
            value={reportDescription}
            onChange={setReportDescription}
          />
        </Box>
        {showLoginModal &&
          <LoginModal
            open={showLoginModal != undefined}
            payload={showLoginModal}
            onLoggedIn={(user) => {
              setIsSignedIn(true)
              setShowLoginModal(undefined)
            }}
            onClose={() => {
              console.log("close")
              setShowLoginModal(undefined)
            }
            } />}
      </Box>
    </ThemeProvider>
  )
}



export default App
