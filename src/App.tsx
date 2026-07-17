import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import * as ExifReader from 'exifreader';
import { getFileHash, isImageReportFile, isSupportedReportFile, isVideoReportFile, MAX_REPORT_IMAGES, MAX_REPORT_VIDEOS } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import type { DetectBox, PlateDetection } from './api/segment';
import Box from '@mui/material/Box';
import { Button, CssBaseline, ThemeProvider, Paper, LinearProgress, useMediaQuery, Avatar } from "@mui/material";
import theme from './theme';
import { fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import { Complaint, complaints, ComplaintsView } from './Complaints';
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
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import { LargeDragDropView } from './LargeDragDropView';
import { clearReportDraft, loadReportDraft, saveReportDraft } from './reportDraft';
import { DevQrCode } from './DevQrCode';

const DetectView = lazy(() => import('./DetectView'))

type ExifTag = {
  description?: string
  value?: unknown
}

const tagText = (tag?: ExifTag) => {
  if (tag?.description != null) {
    return String(tag.description)
  }
  if (tag?.value != null) {
    return String(tag.value)
  }
  return ''
}

const parseExifCoordinate = (coordinateTag?: ExifTag, refTag?: ExifTag) => {
  const coordinate = parseFloat(tagText(coordinateTag))
  if (!Number.isFinite(coordinate) || coordinate === 0) {
    return undefined
  }

  const ref = tagText(refTag).toLowerCase()
  if (ref.includes('south') || ref === 's' || ref.includes('west') || ref === 'w') {
    return -Math.abs(coordinate)
  }
  return coordinate
}

const parseExifDate = (tags: Record<string, ExifTag | undefined>) => {
  const original = tagText(tags['DateTimeOriginal']).trim()
  if (!original) return undefined
  const offset = tagText(tags['OffsetTimeOriginal'] || tags['OffsetTime']).trim()
  const normalized = original
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    .replace(' ', 'T')
  const parsed = new Date(offset ? `${normalized}${offset}` : normalized)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const isUsableLatLng = (latitude?: number, longitude?: number) => {
  return latitude != null
    && longitude != null
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180
    && !(latitude === 0 && longitude === 0)
}

function App() {
  const isMobile = useMediaQuery('(max-width:900px)')

  const [files, setFiles] = useState(new Set<File>())
  const [currentFile, setCurrentFile] = useState<number>()
  const [fileNames, setFileNames] = useState<Set<string>>(new Set())

  const [complaint, setComplaint] = useState<Complaint>()

  const [location, setLocation] = useState<GeoSearchResponse>()

  const [latLng, setLatLng] = useState<number[]>()

  const [hoveredStep, setHoveredStep] = useState<Steps | undefined>()

  const [showLoginModal, setShowLoginModal] = useState<[string, CustomJwtPayload]>()
  const [showAuthModal, setShowAuthModal] = useState(false)

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
  const geoFallbackAttemptedRef = useRef(false)
  const continueVerifyAfterLoginRef = useRef(false)

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
    setPlate(undefined)
    setResults(undefined)
    setCar(undefined)
    setReportDescription('')
    geoFallbackAttemptedRef.current = false
    void clearReportDraft().catch(console.log)
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
  const [draftReady, setDraftReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadReportDraft()
      .then((draft) => {
        if (cancelled || !draft) return
        const restoredFiles = (draft.files || []).filter(isSupportedReportFile)
        setFiles(new Set(restoredFiles))
        setFileNames(new Set(restoredFiles.map(file => file.name)))
        if (restoredFiles.length > 0) setCurrentFile(0)
        setComplaint(complaints.find(item => item.type === draft.complaintType))
        setLocation(draft.location)
        setLatLng(draft.latLng)
        setDateOfIncident(draft.dateOfIncident ? new Date(draft.dateOfIncident) : undefined)
        setPlate(draft.plate as PlateDetection | undefined)
        setReportDescription(draft.reportDescription || '')
      })
      .catch(console.log)
      .finally(() => {
        if (!cancelled) setDraftReady(true)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!draftReady) return
    const persistDraft = () => {
      const hasDraft = files.size > 0 || complaint || location || dateOfIncident || plate || reportDescription.trim()
      if (!hasDraft) {
        void clearReportDraft().catch(console.log)
        return
      }
      void saveReportDraft({
        files: [...files],
        complaintType: complaint?.type,
        location,
        latLng,
        dateOfIncident: dateOfIncident?.toISOString(),
        plate: plate ? {
          text: plate.text,
          state: plate.state,
          plateOverride: plate.plateOverride,
          tlc: plate.tlc,
        } : undefined,
        reportDescription,
      }).catch(console.log)
    }
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") persistDraft()
    }
    const timer = window.setTimeout(persistDraft, 350)
    document.addEventListener("visibilitychange", persistWhenHidden)
    window.addEventListener("pagehide", persistDraft)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", persistWhenHidden)
      window.removeEventListener("pagehide", persistDraft)
    }
  }, [complaint, dateOfIncident, draftReady, files, latLng, location, plate, reportDescription])

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

  const showReportPreviewForUser = (user?: User) => {
    const report = getReport(user)
    setReportPreview(report)
    setShowReportPreview(report != undefined)
  }

  const handleCompletedAuth = (user: User) => {
    setIsSignedIn(user)
    setShowAuthModal(false)
    setShowLoginModal(undefined)
    if (continueVerifyAfterLoginRef.current) {
      continueVerifyAfterLoginRef.current = false
      showReportPreviewForUser(user)
    }
  }

  const handleSuccess = (credentialResponse: any) => {
    // Handle the successful login here
    setShowAuthModal(false)
    return login(credentialResponse, (accessToken: string, jwt: CustomJwtPayload) => {
      setShowLoginModal([accessToken, jwt])
    })
      .then((user) => {
        if (user) {
          handleCompletedAuth(user)
        }
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

  const getReport = (signedInUser = isSignedIn) => {
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

    const user = signedInUser
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

  const handleVerifySubmit = () => {
    if (!isSignedIn) {
      continueVerifyAfterLoginRef.current = true
      setShowAuthModal(true)
      return
    }
    showReportPreviewForUser()
  }

  const onFiles = async (complaint?: Complaint, filez?: File[]) => {
    setShowDragView(false)
    const incomingFiles = (filez || []).filter(isSupportedReportFile)
    const skippedFiles = (filez || []).length - incomingFiles.length
    if (skippedFiles > 0) {
      enqueueSnackbar(`Skipped ${skippedFiles} unsupported file${skippedFiles === 1 ? '' : 's'}. Please choose JPEG, HEIC, WebP, or video.`, {
        variant: "warning",
        autoHideDuration: 6000
      })
    }
    if (incomingFiles.length > 0) {
      const newFiles = new Set<File>(files)
      const newFileNames = new Set(fileNames)
      let rejectedForLimit = 0
      incomingFiles.forEach(file => {
        if (newFileNames.has(file.name)) return
        const existing = [...newFiles]
        const imageCount = existing.filter(isImageReportFile).length
        const videoCount = existing.filter(isVideoReportFile).length
        const canAdd = isVideoReportFile(file)
          ? imageCount === 0 && videoCount < MAX_REPORT_VIDEOS
          : videoCount === 0 && imageCount < MAX_REPORT_IMAGES
        if (!canAdd) {
          rejectedForLimit += 1
          return
        }
        newFiles.add(file)
        newFileNames.add(file.name)
      })
      setFiles(newFiles)
      setFileNames(newFileNames)
      if (currentFile == undefined) {
        setCurrentFile(0)
      }
      if (rejectedForLimit > 0) {
        enqueueSnackbar("Attach up to 3 photos or 1 video. Extra media was not added.", {
          variant: "warning",
          autoHideDuration: 4000,
        })
      }
    }
    if (complaint) {
      setComplaint(complaint)
    }

    const applyGeoData = async (latitude: number, longitude: number, hash: string) => {
      const cachedGeo = reported.get<GeoSearchResponse>(ReportedKeys.Geo, hash)
      const data = cachedGeo ? cachedGeo : await fetchGeoData(latitude, longitude);
      if (data && data?.features?.[0]?.properties?.label?.length > 0) {
        reported.set(ReportedKeys.Geo, data, hash)
        setLocation(data)
        setLatLng([latitude, longitude])
      }
    }

    const requestDeviceLocationFallback = async (hash: string) => {
      if (geoFallbackAttemptedRef.current || latLng || location) {
        return
      }
      geoFallbackAttemptedRef.current = true

      if (!("geolocation" in navigator)) {
        return
      }

      if (!window.isSecureContext) {
        return
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 60_000,
            timeout: 12_000,
          })
        })
        await applyGeoData(position.coords.latitude, position.coords.longitude, `device_${hash}`)
      } catch (error) {
        console.log(error)
      }
    }

    const exifGetter = async (file: File) => {
      if(!isImageReportFile(file)) {
        return
      }
      const hash = await getFileHash(file)
      const tags = await ExifReader.load(file) as Record<string, ExifTag | undefined>;
      const photoDate = parseExifDate(tags)
      if (photoDate) setDateOfIncident(current => current || photoDate)
      const latitude = parseExifCoordinate(tags['GPSLatitude'], tags['GPSLatitudeRef'])
      const longitude = parseExifCoordinate(tags['GPSLongitude'], tags['GPSLongitudeRef'])

      if (!isUsableLatLng(latitude, longitude)) {
        await requestDeviceLocationFallback(hash)
        return
      }
      await applyGeoData(latitude, longitude, hash)
    }

    // Let the UI paint first (hide drag overlay, update previews) before expensive work starts.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const processFiles = async () => {
        const imageFiles = incomingFiles.filter(isImageReportFile)
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
      <DevQrCode />
      {(isModelLoading || isHeicProcessing) && <Paper sx={{
        position: "fixed",
        zIndex: 1400,
        top: 0,
        left: 0,
        width: "100%",
        borderRadius: 0,
        padding: 0,
        background: "transparent",
        border: 0,
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
          boxSizing: "border-box",
          gap: { xs: 1.25, md: 1.5 },
          px: { xs: 1, md: 1.5 },
          py: { xs: 1.25, md: 1.5 },
          overflowX: "hidden",
          alignItems: { xs: "stretch", md: "stretch" },
          background: "linear-gradient(180deg, #f8fafc 0%, #eef2f6 100%)",
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
            pb: { xs: 0, md: 2.5 },
            height: { xs: "auto", md: "100%" },
            boxSizing: "border-box",
            minHeight: { xs: "auto", md: 0 },
            overflowY: { xs: "visible", md: "auto" },
            scrollbarWidth: "thin",
            scrollbarColor: "#aeb8c5 transparent",
            "& > *": {
              marginTop: { xs: 1.25, md: 1.25 }, // Apply margin to all children
            },
            "& > *:first-of-type": {
              marginTop: { xs: 0, md: 0 },
            },
            "& > *:nth-of-type(2)": {
              marginTop: { xs: 1.5, md: 1.5 },
            },
            "& > .fill-remaining": {
              flex: { xs: "0 0 auto", md: "1 1 0" },
              minHeight: { xs: "auto", md: 0 },
              display: { xs: "block", md: "flex" },
              flexDirection: { xs: "column", md: "column" },
            }
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
                width: "100%", overflow: "visible",
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
          {!isMobile && <Paper className="fill-remaining" sx={{
            width: "100%",
            marginTop: 3,
            overflow: "visible"
          }}>
            <Box sx={{
              position: "relative",
              padding: 2,
              paddingTop: 3,
              flex: 1,
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

        </Box>
        {/* Right Column */}
        <Box
          flex={{ xs: "1 1 auto", md: "0 0 50%" }}
          width={{ xs: "100%", md: "auto" }}
          display="flex"
          flexDirection="column"
          sx={{
            mr: { xs: 0, md: 1 },
            pt: { xs: 0, md: 2.5 },
            pb: { xs: 0, md: 2.5 },
            height: { xs: "auto", md: "100%" },
            boxSizing: "border-box",
            minHeight: { xs: "auto", md: 0 },
            overflowY: { xs: "visible", md: "auto" },
            scrollbarWidth: "thin",
            scrollbarColor: "#aeb8c5 transparent",
            "& > *": {
              marginTop: { xs: 1.25, md: 1.25 }, // Apply margin to all children
            },
            "& > *:first-of-type": {
              marginTop: { xs: 0, md: 0 },
            },
            "& > .fill-remaining": {
              flex: { xs: "0 0 auto", md: "1 1 0" },
              minHeight: { xs: "auto", md: 0 },
              display: { xs: "block", md: "flex" },
              flexDirection: { xs: "column", md: "column" },
            },
          }}
        >
          <Box className="fill-remaining">
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
        </Box>
        <Box
          flex={{ xs: "1 1 auto", md: "1" }}
          width={{ xs: "100%", md: "auto" }}
          display="flex"
          flexDirection="column"
          sx={{
            pt: { xs: 0, md: 2.5 },
            pb: { xs: 0, md: 2.5 },
            height: { xs: "auto", md: "100%" },
            boxSizing: "border-box",
            minHeight: { xs: "auto", md: 0 },
            overflowY: { xs: "visible", md: "auto" },
            scrollbarWidth: "thin",
            scrollbarColor: "#aeb8c5 transparent",
            "& > *": {
              marginTop: { xs: 1.25, md: 1.25 }, // Apply margin to all children
            },
            "& > *:first-of-type": {
              marginTop: { xs: 0, md: 0 },
            },
            "& > .fill-remaining": {
              flex: { xs: "0 0 auto", md: "1 1 0" },
              minHeight: { xs: "auto", md: 0 },
              display: { xs: "block", md: "flex" },
              flexDirection: { xs: "column", md: "column" },
            },
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
          <Paper className="fill-remaining" sx={{
            padding: 1,
            paddingTop: 3.5,
            position: "relative",
            mt: { xs: 3, md: 1 },
            overflow: "visible"
          }}>
            <MapPickerView latLng={latLng} location={location} onLocationChange={(location) => {
              if (!location?.features[0]) {
                setLatLng(undefined)
                setLocation(undefined)
                return
              }
              setLatLng([location.features[0].geometry.coordinates[1], location.features[0].geometry.coordinates[0]])
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
            }} value={dateOfIncident} onExtractFromPhoto={async () => {
              const selectedFile = [...files][currentFile ?? 0]
              if (!selectedFile || !isImageReportFile(selectedFile)) return undefined
              const tags = await ExifReader.load(selectedFile) as Record<string, ExifTag | undefined>
              return parseExifDate(tags)
            }} />
            <StepView hasError={reportError && reportError.has(ReportErrors.MISSING_DATE)}>
              5
            </StepView>
            <TextArea
              value={reportDescription}
              onChange={setReportDescription}
            />

          </Paper>
          {!isMobile && <Paper sx={{
            overflow: "visible",
            mt: { xs: 3, md: "auto" },
            position: "relative",
            width: "100%",
          }}>
            <Box sx={{ p: 1.5 }}>
              <Button
                onClick={handleVerifySubmit}
                variant="contained"
                sx={{
                  width: "100%",
                  minHeight: 56,
                  position: "relative",
                  borderRadius: "999px",
                  textTransform: "none",
                  fontWeight: 700,
                  letterSpacing: 0,
                  color: "#fff",
                  background: "linear-gradient(135deg, #0f6fb2 0%, #0f766e 100%)",
                  boxShadow: "0 10px 20px rgba(15, 111, 178, 0.22)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #0b4f80 0%, #0a5651 100%)",
                    boxShadow: "0 12px 24px rgba(15, 111, 178, 0.28)",
                  },
                }}
              >
                <Avatar sx={{
                  position: "absolute",
                  left: 8,
                  width: 30,
                  height: 30,
                  bgcolor: "#f9d978",
                  color: "#172033",
                  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.2)",
                  fontSize: "0.95rem",
                  fontWeight: 700
                }}>6</Avatar>
                Verify & Submit
              </Button>
            </Box>
          </Paper>}
          {isMobile && <Paper sx={{
            overflow: "visible",
            marginTop: 3,
            marginBottom: 1,
            position: "relative",
            width: "100%",
          }}>
            <Button
              onClick={handleVerifySubmit}
              variant="contained"
              sx={{
                width: "100%",
                height: "100%",
                position: "relative",
                minHeight: 52,
                borderRadius: "999px",
                textTransform: "none",
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, #0f6fb2 0%, #0f766e 100%)",
                boxShadow: "0 10px 20px rgba(15, 111, 178, 0.22)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0b4f80 0%, #0a5651 100%)",
                  boxShadow: "0 12px 24px rgba(15, 111, 178, 0.28)",
                },
              }}>
              <Avatar sx={{
                position: "absolute",
                left: 8,
                width: 28,
                height: 28,
                bgcolor: "#f9d978",
                color: "#172033",
                boxShadow: "0 2px 6px rgba(15, 23, 42, 0.2)",
                fontSize: "0.9rem",
                fontWeight: 700
              }}>6</Avatar>
              VERIFY & SUBMIT
            </Button>
          </Paper>}
        </Box>
        {showAuthModal &&
          <LoginModal
            open={showAuthModal}
            onLoggedIn={handleCompletedAuth}
            onGoogleSuccess={handleSuccess}
            onGoogleError={handleError}
            onAppleSignIn={() => {
              enqueueSnackbar('Apple Sign in is not configured yet.', {
                variant: 'info',
              })
            }}
            onClose={() => {
              continueVerifyAfterLoginRef.current = false
              setShowAuthModal(false)
            }}
          />}
        {showLoginModal &&
          <LoginModal
            open={showLoginModal != undefined}
            payload={showLoginModal}
            onLoggedIn={handleCompletedAuth}
            onClose={() => {
              continueVerifyAfterLoginRef.current = false
              setShowLoginModal(undefined)
            }
            } />}
        {showReportPreview && reportPreview &&
          <SubmissionPreview
            onCancel={() => {
              setShowReportPreview(false)
            }}
            onComplete={() => {
              setShowReportPreview(false)
              setReportPreview(undefined)
              clearState()
            }}
            open={showReportPreview}
            report={reportPreview} />}
        <SnackbarProvider />
      </Box>
    </ThemeProvider>
  )
}



export default App
