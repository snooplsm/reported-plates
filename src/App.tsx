import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import * as ExifReader from 'exifreader';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import type { DetectBox, PlateDetection } from './api/segment';
import Box from '@mui/material/Box';
import { Button, CssBaseline, ThemeProvider, Paper, LinearProgress, useMediaQuery, } from "@mui/material";
import theme from './theme';
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

const DetectView = lazy(() => import('./DetectView'))

function App() {
  const isMobile = useMediaQuery('(max-width:900px)')

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

  const [modelsReady, setModelsReady] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadState, setModelLoadState] = useState({
    text: "Preparing AI models...",
    progress: 0
  })
  const [heicProcessing, setHeicProcessing] = useState<Record<string, { text: string; progress: number }>>({})

  const [reportPreview, setReportPreview] = useState<Report>()

  const [showReportPreview, setShowReportPreview] = useState(false)

  const [reportError, setReportError] = useState<Set<ReportErrors>>()

  const userRef = useRef<UserViewRef | null>(null)

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
    setHeicProcessing({})
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
  const dragDepthRef = useRef(0)
  const warmupWorkerRef = useRef<Worker | null>(null)
  const warmupPromiseRef = useRef<Promise<void> | null>(null)
  const segmentApiPromiseRef = useRef<Promise<typeof import('./api/segment')> | null>(null)
  const autoDetectTimerRef = useRef<number | null>(null)
  const autoDetectRunIdRef = useRef(0)
  const onHeicProcessingChange = useCallback((id: string, status?: { text: string; progress: number }) => {
    setHeicProcessing((prev) => {
      const next = { ...prev }
      if (status) {
        next[id] = status
      } else {
        delete next[id]
      }
      return next
    })
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('./workers/modelWarmup.worker.ts', import.meta.url), { type: 'module' })
    warmupWorkerRef.current = worker

    const onWorkerMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: { text?: string; progress?: number; message?: string } }
      if (!data?.type) return
      if (data.type === "progress" && data.payload?.progress != null && data.payload?.text) {
        setIsModelLoading(true)
        setModelLoadState({
          text: data.payload.text,
          progress: data.payload.progress,
        })
      } else if (data.type === "done") {
        setModelsReady(true)
        setIsModelLoading(false)
        setModelLoadState({ text: "Models ready", progress: 100 })
      } else if (data.type === "error") {
        setIsModelLoading(false)
        setModelLoadState({ text: "Model load failed", progress: 0 })
        enqueueSnackbar(`Model load failed: ${data.payload?.message || "Unknown error"}`, {
          variant: "warning",
          autoHideDuration: 5000
        })
      }
    }

    worker.addEventListener("message", onWorkerMessage)

    return () => {
      worker.removeEventListener("message", onWorkerMessage)
      worker.terminate()
      warmupWorkerRef.current = null
      warmupPromiseRef.current = null
      if (autoDetectTimerRef.current != null) {
        window.clearTimeout(autoDetectTimerRef.current)
        autoDetectTimerRef.current = null
      }
    }
  }, [])

  const loadSegmentApi = () => {
    if (!segmentApiPromiseRef.current) {
      segmentApiPromiseRef.current = import('./api/segment')
    }
    return segmentApiPromiseRef.current
  }

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes("Files")

    const onWindowDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      dragDepthRef.current += 1
      setShowDragView(true)
    }

    const onWindowDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
    }

    const onWindowDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) {
        setShowDragView(false)
      }
    }

    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault()
      dragDepthRef.current = 0
      setShowDragView(false)
    }

    const onWindowDragEnd = () => {
      dragDepthRef.current = 0
      setShowDragView(false)
    }

    window.addEventListener("dragenter", onWindowDragEnter)
    window.addEventListener("dragover", onWindowDragOver)
    window.addEventListener("dragleave", onWindowDragLeave)
    window.addEventListener("drop", onWindowDrop)
    window.addEventListener("dragend", onWindowDragEnd)

    return () => {
      window.removeEventListener("dragenter", onWindowDragEnter)
      window.removeEventListener("dragover", onWindowDragOver)
      window.removeEventListener("dragleave", onWindowDragLeave)
      window.removeEventListener("drop", onWindowDrop)
      window.removeEventListener("dragend", onWindowDragEnd)
      dragDepthRef.current = 0
    }
  }, [modelsReady])

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

  const startModelWarmup = useCallback(() => {
    if (modelsReady) {
      return Promise.resolve()
    }
    if (warmupPromiseRef.current) {
      return warmupPromiseRef.current
    }
    if (!warmupWorkerRef.current) {
      return Promise.resolve()
    }

    setIsModelLoading(true)
    setModelLoadState({
      text: "Preparing AI runtime...",
      progress: 5
    })
    warmupPromiseRef.current = new Promise<void>((resolve) => {
      if (!warmupWorkerRef.current) {
        resolve()
        return
      }
      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string }
        if (data?.type === "done" || data?.type === "error") {
          warmupWorkerRef.current?.removeEventListener("message", onMessage)
          warmupPromiseRef.current = null
          resolve()
        }
      }
      warmupWorkerRef.current.addEventListener("message", onMessage)
      warmupWorkerRef.current.postMessage({ type: "warmup" })
    })

    return warmupPromiseRef.current
  }, [modelsReady])

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
      if (userRef.current) {
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
    if (filez && filez.length > 0) {
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
      if(file.type.indexOf('image/')==-1) {
        return
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

    // Let the UI paint first (hide drag overlay, update previews) before expensive work starts.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const processFiles = async () => {
        const imageFiles = (filez || []).filter((file) => file.type.indexOf('image/') !== -1)
        for (const file of imageFiles) {
          void exifGetter(file).catch(console.log)
        }

        if (imageFiles.length === 0 || plate?.image) {
          return
        }

        const runId = ++autoDetectRunIdRef.current
        if (autoDetectTimerRef.current != null) {
          window.clearTimeout(autoDetectTimerRef.current)
        }
        autoDetectTimerRef.current = window.setTimeout(() => {
          const runDetection = async () => {
            if (runId !== autoDetectRunIdRef.current) {
              return
            }
            const { segment } = await loadSegmentApi()
            const result = await segment(imageFiles[0])
            if (!result || runId !== autoDetectRunIdRef.current) {
              return
            }
            const carWithPlates = result.filter(res => res.plate != null)
            setResults(carWithPlates)
            if (carWithPlates[0]) {
              const carWithPlate = carWithPlates[0]
              setCar((prev) => prev || carWithPlate)
              setPlate((prev) => prev || carWithPlate.plate!)
            }
          }
          void runDetection().catch(console.log)
        }, 1200)
      }
      void processFiles()
    }))
  }
  const heicStates = Object.values(heicProcessing)
  const isHeicProcessing = heicStates.length > 0
  const heicProgress = isHeicProcessing
    ? heicStates.reduce((acc, state) => acc + state.progress, 0) / heicStates.length
    : 0
  const topBarValue = isModelLoading ? modelLoadState.progress : heicProgress

  return (

    <ThemeProvider theme={theme}>
      <CssBaseline />
      {(isModelLoading || isHeicProcessing) && <Paper sx={{
        position: "fixed",
        zIndex: 1400,
        top: 0,
        left: 0,
        width: "100%",
        borderRadius: 0,
        padding: 0,
        background: "transparent",
        boxShadow: "none"
      }}>
        <LinearProgress variant="determinate" value={topBarValue} sx={{ height: 3 }} />
      </Paper>}
      {showDragView && <LargeDragDropView onFiles={onFiles} />}
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        sx={{
          width: "100%",
          maxWidth: "100vw",
          gap: 1,
          px: { xs: 1, md: 1 },
          py: { xs: 2, md: 0 },
          overflowX: "hidden",
        }}
        height={{ xs: "auto", md: "100vh" }}
      >
        {/* Left Column */}
        <Box
          flex={{ xs: "1 1 auto", md: "0 0 20%" }}
          width={{ xs: "100%", md: "auto" }}
          display="flex"
          flexDirection="column"
          justifyContent="start"
          sx={{
            ml: { xs: 0, md: 0.5 },
            pt: { xs: 0, md: 2.5 },
            "& > *": {
              marginTop: { xs: 2, md: 1 }, // Apply margin to all children
            },
            "& > *:first-of-type": {
              marginTop: { xs: 2, md: 0 },
            },
            "& > *:nth-of-type(2)": {
              marginTop: { xs: 3, md: 3 },
            },
          }}
        >
          <Paper sx={{ width: "100%", p: 1 }}>
            <UserView
              ref={userRef}
              isSignedIn={isSignedIn != undefined}
              handleSuccess={handleSuccess}
              handleError={handleError}
            />
          </Paper>
          <Paper sx={{ width: "100%", position: "relative", paddingTop: 3, overflow: "visible" }}>
            <ComplaintsView
              showCaption={true}
              step={Steps.DRAG_PHOTO_OR_UPLOAD}
              hoveredStep={hoveredStep}
              onFiles={onFiles}
              selectedComplaint={complaint}
              onChange={(complaint) => {
                setComplaint(complaint)
              }}
            />
            <StepView hasError={reportError && reportError.has(ReportErrors.NO_PHOTOS)} sx={{
              fontSize: "90%"
            }}>1 & 2</StepView>
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
                const id = `${x.name}_${x.lastModified}_${x.size}`
                return <FileUploadPreview key={id} id={id} onProcessingChange={onHeicProcessingChange} onClick={() => {
                  setCurrentFile(index)
                }} file={x} onClickDelete={() => {
                  onHeicProcessingChange(id, undefined)
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
          {!isMobile && <Paper sx={{
            width: "100%",
            marginTop: 3,
            overflow: "visible"
          }}>
            <Box sx={{
              position: "relative",
              padding: 2,
              paddingTop: 3
            }}>
              <Box sx={{
                // marginLeft: 2
              }}>
                <DetectionView boxes={results} onPlateChange={onPlate} onCarWithPlate={(results, plate) => {
                  setResults(results)
                  // setBoxes(result)
                  setCar(plate)
                  setPlate(plate.plate!)
                }} plate={plate} />
              </Box>
              <StepView hasError={reportError && (reportError.has(ReportErrors.MISSING_PLATE) || reportError.has(ReportErrors.MISSING_PLATE_STATE))}>
                3</StepView>
            </Box>
          </Paper>}

          {!isMobile && <Paper sx={{
            overflow: "display",
            marginTop: 3,
            position: "relative",
            width: "100%",
          }}>

              <Button
              onClick={async () => {

                const report = getReport()
  
                setReportPreview(report)
                setShowReportPreview(true)
              }}
              variant="text"
              sx={{
                
                width: "100%",
                height: "100%",
                padding: 2
              }}>
              VERIFY & SUBMIT
              </Button>
            <StepView hasError={undefined}>6</StepView>
          </Paper>}
        </Box>
        {/* Right Column */}
        <Box
          flex={{ xs: "1 1 auto", md: "0 0 50%" }}
          width={{ xs: "100%", md: "auto" }}
          display="flex"
          sx={{
            mr: { xs: 0, md: 1 },
            pt: { xs: 0, md: 2.5 },
            "& > *": {
              marginTop: { xs: 2, md: 1 }, // Apply margin to all children
            },
            "& > *:first-of-type": {
              marginTop: { xs: 2, md: 0 },
            }
          }}
        >
          {(currentFile == undefined) &&
            <HowToGuide onStepHovered={(step) => {
              setHoveredStep(step)
            }} handleError={handleError} isSignedIn={isSignedIn} handleSuccess={handleSuccess} videoUrl='video/howto1.mp4' />}
          {currentFile != undefined && currentFile >= 0 &&
            <Suspense fallback={<Paper sx={{ p: 2 }}><LinearProgress /></Paper>}>
              <DetectView file={[...files][currentFile]} onCarWithPlate={(result: DetectBox[], car: DetectBox) => {
                setResults(result)
                // setBoxes(result)
                setCar(car)
                setPlate(car.plate!)
              }} onPlate={(manualPlate) => {
                setPlate(manualPlate)
              }} />
            </Suspense>
          }
        </Box>
        <Box
          flex={{ xs: "1 1 auto", md: "1" }}
          width={{ xs: "100%", md: "auto" }}
          sx={{
            pt: { xs: 0, md: 2.5 },
            "& > *": {
              marginTop: { xs: 2, md: 1 }, // Apply margin to all children
            },
            "& > *:first-of-type": {
              marginTop: { xs: 2, md: 0 },
            }
          }
          }
        >
          {isMobile && <Paper sx={{
            width: "100%",
            marginTop: 3,
            position: "relative"
          }}>
            <Box sx={{
              position: "relative",
              padding: 2,
              paddingTop: 3
            }}>
              <DetectionView boxes={results} onPlateChange={onPlate} onCarWithPlate={(results, plate) => {
                setResults(results)
                setCar(plate)
                setPlate(plate.plate!)
              }} plate={plate} />
              <StepView hasError={reportError && (reportError.has(ReportErrors.MISSING_PLATE) || reportError.has(ReportErrors.MISSING_PLATE_STATE))}>
                3
              </StepView>
            </Box>
          </Paper>}
          <Paper sx={{
            padding: 1,
            paddingTop: 3.5,
            position: "relative",
            mt: { xs: 3, md: 1 },
            overflow: "visible"
          }}>
            <MapPickerView latLng={latLng} location={location} onLocationChange={(location) => {
              setLatLng([location?.features[0].geometry.coordinates[1], location?.features[0].geometry.coordinates[0]])
              setLocation(location)
            }} />
            <StepView hasError={reportError && reportError.has(ReportErrors.MISSING_ADDRESS)}>
              4
            </StepView>
          </Paper>
          <Paper sx={{
            marginTop: 3,
            position: "relative",
            padding: 1,
            paddingTop: 2,
            overflow: "visible"

          }}>
            <BasicDateTimePicker onChange={(value) => {
              setDateOfIncident(value)
            }} value={dateOfIncident} />
            <StepView hasError={reportError && reportError.has(ReportErrors.MISSING_DATE)}>
              5
            </StepView>
            <TextArea
              value={reportDescription}
              onChange={setReportDescription}
            />

          </Paper>
          {isMobile && <Paper sx={{
            overflow: "display",
            marginTop: 3,
            marginBottom: 1,
            position: "relative",
            width: "100%",
          }}>
            <Button
              onClick={async () => {
                const report = getReport()
                setReportPreview(report)
                setShowReportPreview(true)
              }}
              variant="text"
              sx={{
                width: "100%",
                height: "100%",
                padding: 2
              }}>
              VERIFY & SUBMIT
            </Button>
            <StepView hasError={undefined}>6</StepView>
          </Paper>}
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
            onComplete={(report) => {
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
        <SnackbarProvider />
      </Box>
    </ThemeProvider>
  )
}



export default App
