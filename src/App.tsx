import { useEffect, useRef, useState } from 'react'
import './App.css'
import cv from "@techstark/opencv-js";
import * as ExifReader from 'exifreader';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import { DetectBox, downloadAll, PlateDetection, segment } from './api/segment';
import Box from '@mui/material/Box';
import { Button, CssBaseline, ThemeProvider, Paper, Typography, CardActionArea, } from "@mui/material";
import theme from './theme';
import DetectView from './DetectView';
import { fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import { Complaint, ComplaintsView } from './Complaints';
import { StepView } from './StepView';
import { UserView, UserViewRef } from './UserView'
import { DetectionView } from './DetectionView';
import FileUploadPreview from './FileUploadPreview';
import HowToGuide, { Steps } from './HowToGuide';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import { BasicDateTimePicker } from './BasicDateTimePicker';
import { MapPickerView } from './MapPickerView';
import { JwtPayload } from 'jwt-decode';
import LoginModal, { CustomJwtPayload } from './LoginModal';
import { isLoggedIn, login, Report, ReportErrors, userLogin, userLogout, User } from './Auth';
import TextArea from './TextArea';
import { SubmissionPreview } from './SubmissionPreview';
import { classifyVehicle } from './classifyVehicle';
import { SnackbarProvider, enqueueSnackbar, closeSnackbar } from 'notistack';
import { LargeDragDropView } from './LargeDragDropView';


function App() {

  const [files, setFiles] = useState(new Set<File>())
  const [currentFile, setCurrentFile] = useState<number>()
  const [fileNames, setFileNames] = useState<Set<string>>(new Set())

  const [complaint, setComplaint] = useState<Complaint>()

  const [location, setLocation] = useState<GeoSearchResponse>()

  const [latLng, setLatLng] = useState<Number[]>()

  const [hoveredStep, setHoveredStep] = useState<Steps | undefined>()

  const [showLoginModal, setShowLoginModal] = useState<[string, CustomJwtPayload]>()

  const [isSignedIn, setIsSignedIn] = useState<User>()

  const [dateOfIncident, setDateOfIncident] = useState<Date>()

  const [, setLoaded] = useState(false)

  const [reportPreview, setReportPreview] = useState<Report>()

  const [showReportPreview, setShowReportPreview] = useState(false)

  const [reportError, setReportError] = useState<Set<ReportErrors>>()

  const userRef = useRef<UserViewRef|null>(null)

  const clearState = () => {
    setFiles(new Set())
    setFileNames(new Set())
    setReportPreview(undefined)
    setCurrentFile(undefined)
    setReportError(undefined)
    setDateOfIncident(undefined)
    setLatLng(undefined)
    setComplaint(undefined)
    setLocation(undefined)
  }

  useEffect(() => {
    const loginSub = userLogin.subscribe((user) => {
      setIsSignedIn(user)
    })
    const logoutSub = userLogout.subscribe(() => {
      setIsSignedIn(undefined)
    })
    return () => {
      loginSub.unsubscribe()
      logoutSub.unsubscribe()
    }
  }, [])

  const onPlate = (plates: PlateDetection) => {
    if (!plate) {
      setPlate(plates)
    }
    if (plate) {
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

  const [showDragView, setShowDragView] = useState(false)

  useEffect(() => {
    const signedIn = async () => {
      const user = await isLoggedIn()
      setIsSignedIn(user)
    }
    signedIn()
  }, [])

  const handleSuccess = (credentialResponse: any) => {
    // Handle the successful login here
    login(credentialResponse, (accessToken: string, jwt: CustomJwtPayload) => {
      setShowLoginModal([accessToken, jwt])
    })
      .then(() => {
        
      }).catch(e => {
        console.log(e)
      })
  };

  const handleError = () => {
    // Handle login errors here
    console.log('Google login failed');
  };

  let initialized = false

  cv["onRuntimeInitialized"] = async () => {
    if (!initialized) {
      initialized = true
    }
    await downloadAll(()=> {})
    setLoaded(true)
  }

  const getReport = () => {
    const err: Set<ReportErrors> = new Set()
    let license: string | undefined
    let state: string | undefined
    if (!plate) {
      err.add(ReportErrors.MISSING_PLATE)
    } else {
      license = plate?.plateOverride?.trim() ? plate.plateOverride : plate?.text
      if (!license) {
        err.add(ReportErrors.MISSING_PLATE)
      }

      state = plate?.state
      if (!state) {
        err.add(ReportErrors.MISSING_PLATE_STATE)
      }
    }

    const fileZ = files
    if ((!fileZ || (files.size || 0) < 1)) {
      err.add(ReportErrors.NO_PHOTOS)
    }

    const timeofreport = dateOfIncident
    if (!timeofreport) {
      err.add(ReportErrors.MISSING_DATE)
    }

    const addy = location?.features[0]

    if (!addy) {
      err.add(ReportErrors.MISSING_ADDRESS)
    }


    const latLng = location?.features[0].geometry
    if (!latLng) {
      err.add(ReportErrors.MISSING_ADDRESS)
    }

    const _complaint = complaint

    if (!_complaint) {
      err.add(ReportErrors.MISSING_COMPLAINT)
    }

    const user = isSignedIn
    if (user == undefined) {
      err.add(ReportErrors.NOT_LOGGED_IN)
      if(userRef.current) {
        userRef.current.refreshUserAvatar()
      }
    }
    if (err.size > 0) {
      setReportError(err)
      return
    } else {
      setReportError(undefined)
    }
    const report = {
      license: license!,
      state: state!,
      files: [...fileZ]!,
      timeofreport: timeofreport!,
      address: addy!,
      reportDescription: reportDescription.trim(),
      testify: true,
      passenger: false,
      typeofcomplaint: complaint?.type!,
      user: user!
    } as Report
    classifyVehicle(license!, state)
      .then(result => {
        report.colorTaxi = result.vehicleType
        setReportPreview(report)
      }).catch(e => {
        console.log("error on plate lookup")
      })
    return report
  }

  const onFiles = async (complaint?: Complaint, filez?: File[]) => {
    setShowDragView(false)
    if (filez && filez.length>0) {
      const newFiles = new Set<File>(files)
      filez.forEach(file => {
        if (!fileNames.has(file.name)) {
          newFiles.add(file)
        }
      })
      setFiles(newFiles)
      if (currentFile == undefined) {
        setCurrentFile(0)
      }
    }
    if (complaint) {
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
        // setFeature(data.features[0])
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
          if (result) {
            const carWithPlates = result.filter(res => res.plate != null)
            setResults(carWithPlates)
            // setBoxes(carWithPlates)
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
  let step = 1
  return (

    <ThemeProvider theme={theme}>
      <CssBaseline />
      {showDragView && <LargeDragDropView onFiles={onFiles}/>}
      <Box width="100%"><UserView ref={userRef} isSignedIn={isSignedIn != undefined} handleSuccess={handleSuccess} handleError={handleError} /></Box>
      <Box
        
        display="flex"
        sx={{
          "& > *": {
            margin: 1, // Apply margin to all children
          },
        }}
        height="100vh"
        onDragOver={(e)=> {
          // e.preventDefault()
          setShowDragView(true)
        }}
      >
        {/* Left Column */}
        <Box
          flex="0 0 20%"
          display="flex"
          flexDirection="column"
          justifyContent="start"
          sx={{
            "& > *": {
              marginTop: 1, // Apply margin to all children
            },
            "& > *::first-of-type": {
              marginTop: 0, // Apply margin to all children
            },
          }}
        >
          <Paper sx={{ width: "100%", position: "relative", paddingTop: 3 }}>
            <ComplaintsView showCaption={true} step={Steps.DRAG_PHOTO_OR_UPLOAD} hoveredStep={hoveredStep} onFiles={onFiles} selectedComplaint={complaint} onChange={(complaint) => {
              setComplaint(complaint)
            }
            } />
            <StepView hasError={reportError && reportError.has(ReportErrors.NO_PHOTOS)} sx={{
              fontSize: "90%"
            }}>{step++} & {step++}</StepView>
          </Paper>
          {files.size > 0 && <Paper>
            <Box
              display="flex"
              sx={{
                position: "relative",
                height: "auto",

                padding: .5,
                width: "100%", overflow: "display",
              }}>
              {[...(files || [])].map((x, index) => {
                return <FileUploadPreview onClick={() => {
                  setCurrentFile(index)
                }} file={x} onClickDelete={() => {
                  setFiles((files) => {
                    let fileIndex = undefined
                    if (currentFile) {
                      fileIndex = [...files].indexOf(x)
                      if (fileIndex <= currentFile) {
                        fileIndex = Math.max(0, currentFile - 1)
                      }
                      if (files.size - 1 <= 0) {
                        fileIndex = undefined
                      }
                    }
                    setCurrentFile(fileIndex)
                    fileNames.delete(x.name)
                    files.delete(x)
                    return new Set(files)
                  })
                }} />
              })}
            </Box>
          </Paper>}
          <Paper sx={{
            width: "100%",
            marginTop: 3
          }}>
            <Box sx={{
              position: "relative",
              padding: 2,
              paddingTop: 3
            }}>
              <Box sx={{
                // marginLeft: 2
              }}>
                <DetectionView boxes={results} onPlateChange={onPlate} onCarWithPlate={(results, plate)=> {
                  setResults(results)
                  // setBoxes(result)
                  setCar(plate)
                  setPlate(plate.plate!)
                }} plate={plate} />
              </Box>
              <StepView hasError={reportError && (reportError.has(ReportErrors.MISSING_PLATE) || reportError.has(ReportErrors.MISSING_PLATE_STATE))}>
                {step++}</StepView>
            </Box>
          </Paper>

          <Paper sx={{
            overflow: "display",
            marginTop: 3,
            padding: 3,
            position: "relative"
          }}>
            <CardActionArea sx={{
              flex: 1
            }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  textAlign: "center",
                  color: theme.palette.primary.main
                }}
                size='large'
                onClick={async () => {

                  const report = getReport()

                  setReportPreview(report)
                  setShowReportPreview(true)
                }}
              >
                VERIFY & SUBMIT
              </Typography>
            </CardActionArea>
            <StepView hasError={undefined}>{step + 2}</StepView>
          </Paper>
        </Box>
        {/* Right Column */}
        <Box
          flex="0 0 50%"
          display="flex"
          sx={{
            "& > *": {
              marginTop: 1, // Apply margin to all children
            },
            "& > *::first-of-type": {
              marginTop: 0, // Apply margin to all children
            }
          }}
        >
          {(currentFile == undefined) &&
            <HowToGuide onStepHovered={(step) => {
              setHoveredStep(step)
            }} handleError={handleError} isSignedIn={isSignedIn} handleSuccess={handleSuccess} videoUrl='video/howto1.mp4' />}
          {currentFile != undefined && currentFile >= 0 &&
            <DetectView file={[...files][currentFile]} onCarWithPlate={(result: DetectBox[], car: DetectBox) => {
              setResults(result)
              // setBoxes(result)
              setCar(car)
              setPlate(car.plate!)
            }} />
          }
        </Box>
        <Box
          flex="1"
          sx={{
            "& > *": {
              marginTop: 1, // Apply margin to all children
            },
            "& > *::first-of-type": {
              marginTop: 0, // Apply margin to all children
            }
          }
          }
        >
          <Paper sx={{
            padding: 1,
            paddingTop: 3.5,
            position: "relative"
          }}>
            <MapPickerView latLng={latLng} location={location} onLocationChange={(location) => {
              setLatLng([location?.features[0].geometry.coordinates[1], location?.features[0].geometry.coordinates[0]])
              setLocation(location)
            }} />
            <StepView hasError={reportError && reportError.has(ReportErrors.MISSING_ADDRESS)}>
              {step++}
            </StepView>
          </Paper>
          <Paper sx={{
            marginTop: 3,
            position: "relative",
            padding: 1,
            paddingTop: 2

          }}>
            <BasicDateTimePicker onChange={(value) => {
              setDateOfIncident(value)
            }} value={dateOfIncident} />
            <StepView hasError={reportError && reportError.has(ReportErrors.MISSING_DATE)}>
              {step++}
            </StepView>
            <TextArea
              value={reportDescription}
              onChange={setReportDescription}
            />

          </Paper>
        </Box>
        {showLoginModal &&
          <LoginModal
            open={showLoginModal != undefined}
            payload={showLoginModal}
            onLoggedIn={(user) => {
              setIsSignedIn(user)
              setShowLoginModal(undefined)
            }}
            onClose={() => {
              setShowLoginModal(undefined)
            }
            } />}
        {showReportPreview && reportPreview &&
          <SubmissionPreview
            onCancel={() => {
              setShowReportPreview(false)
            }}
            onComplete={(report)=> {
              setShowReportPreview(false)
              setReportPreview(undefined)
              clearState()
              enqueueSnackbar(`${report.typeofcomplaint} w/ plate ${report.license} @ ${report.address.properties.label} at ${report.timeofreport}`, {
                autoHideDuration: 20000,
                variant: 'success',
                action: (key) => (
                  <>
                      {/* <Button
                          size='small'
                          onClick={() => alert(`Clicked on action of snackbar with id: ${key}`)}
                      >
                          Undo
                      </Button> */}
                      <Button size='small' onClick={() => closeSnackbar(key)}>
                          Dismiss
                      </Button>
                  </>
              )
              })
            }}
            open={showReportPreview}
            report={reportPreview} />}
        <SnackbarProvider/>                
      </Box>            
    </ThemeProvider>
  )
}



export default App
