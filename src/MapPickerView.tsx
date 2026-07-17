import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import L, { LatLng } from 'leaflet';
import { useCallback, useEffect, useRef, useState } from "react"
import { Feature, fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import { Box, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import { GeoSearchAutocomplete } from './api/ny/nyc/GeoSearchAutocomplete';

type MapProps = {
    latLng?: number[],
    location?: GeoSearchResponse,
    onLocationChange?: (location?: GeoSearchResponse) => void
};

const DEFAULT_CENTER_KEY = "reported-default-map-center"
const MOBILE_PAN_SENSITIVITY = 2

const getStartingCenter = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(DEFAULT_CENTER_KEY) || "null")
        if (Array.isArray(saved) && saved.length === 2 && saved.every(Number.isFinite)) {
            return new LatLng(saved[0], saved[1])
        }
    } catch {}
    return new LatLng(40.76, -73.99)
}

const DesktopMapDragListener = ({ onGestureEnd }: {
    onGestureEnd: (latLng: number[]) => void
}) => {
    useMapEvents({
        dragend(event) {
            const next = event.target.getCenter()
            onGestureEnd([next.lat, next.lng])
        },
    })
    return null
}

const MobileMapGestureLayer = ({ map, onGestureEnd, onSingleTouch }: {
    map?: L.Map
    onGestureEnd: (latLng: number[]) => void
    onSingleTouch: () => void
}) => {
    const layerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const layer = layerRef.current
        if (!layer || !map) return
        let active = false
        let previousCenter = { x: 0, y: 0 }
        let previousDistance = 1

        const metrics = (touches: TouchList) => {
            const first = touches[0]
            const second = touches[1]
            return {
                center: { x: (first.clientX + second.clientX) / 2, y: (first.clientY + second.clientY) / 2 },
                distance: Math.max(1, Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)),
            }
        }
        const onTouchStart = (event: TouchEvent) => {
            if (event.touches.length === 1) onSingleTouch()
            if (event.touches.length < 2) return
            event.preventDefault()
            const next = metrics(event.touches)
            active = true
            previousCenter = next.center
            previousDistance = next.distance
        }
        const onTouchMove = (event: TouchEvent) => {
            if (!active || event.touches.length < 2) return
            event.preventDefault()
            const next = metrics(event.touches)
            const dx = next.center.x - previousCenter.x
            const dy = next.center.y - previousCenter.y
            map.panBy(L.point(
                -dx * MOBILE_PAN_SENSITIVITY,
                -dy * MOBILE_PAN_SENSITIVITY,
            ), { animate: false })

            const zoomDelta = Math.log2(next.distance / previousDistance)
            if (Math.abs(zoomDelta) > 0.015) {
                const bounds = layer.getBoundingClientRect()
                const zoomPoint = L.point(next.center.x - bounds.left, next.center.y - bounds.top)
                const targetZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + zoomDelta))
                map.setZoomAround(zoomPoint, targetZoom)
            }
            previousCenter = next.center
            previousDistance = next.distance
        }
        const finishGesture = (event: TouchEvent) => {
            if (!active || event.touches.length >= 2) return
            active = false
            const center = map.getCenter()
            onGestureEnd([center.lat, center.lng])
        }

        layer.addEventListener('touchstart', onTouchStart, { passive: false })
        layer.addEventListener('touchmove', onTouchMove, { passive: false })
        layer.addEventListener('touchend', finishGesture, { passive: false })
        layer.addEventListener('touchcancel', finishGesture, { passive: false })
        return () => {
            layer.removeEventListener('touchstart', onTouchStart)
            layer.removeEventListener('touchmove', onTouchMove)
            layer.removeEventListener('touchend', finishGesture)
            layer.removeEventListener('touchcancel', finishGesture)
        }
    }, [map, onGestureEnd, onSingleTouch])

    return <Box ref={layerRef} sx={{
        position: 'absolute',
        zIndex: 550,
        inset: 0,
        touchAction: 'pan-y',
    }} />
}

export const MapPickerView = ({ latLng, location, onLocationChange = () => { } }: MapProps) => {
    const isMobile = useMediaQuery('(max-width:900px)')

    const [center, setCenter] = useState<LatLng>(getStartingCenter)
    const [centerLocation, setCenterLocation] = useState<GeoSearchResponse>()
    const [showGestureGuide, setShowGestureGuide] = useState(false)
    const gestureGuideTimerRef = useRef<number | null>(null)

    const [map, setMap] = useState<L.Map>()
    const reverseGeocodeRunRef = useRef(0)
    const handleMapRef = useCallback((map: L.Map | null) => {
        if (map) {
            setMap(map)
        }
    }, [])

    useEffect(() => {
        if (!latLng) {
            return
        }
        const newCenter = new LatLng(latLng[0]!, latLng[1]!)
        if (latLng) {
            setCenter(newCenter)
        }
        setCenterLocation(location)
        if (map) {
            map.setView(newCenter, map.getZoom());
        }
    }
        , [latLng, location, map])

    const onSearchChange = (resp: GeoSearchResponse, value: Feature) => {
        const reverse = new LatLng(value.geometry.coordinates[1], value.geometry.coordinates[0])
        setCenter(reverse)

        const resp2 = { ...resp }
        resp2.features = [value]
        setCenterLocation(resp2)
        onLocationChange(resp2)
        if (map) {
            map.setView(reverse, map.getZoom());
        }
    }

    useEffect(() => () => {
        if (gestureGuideTimerRef.current != null) window.clearTimeout(gestureGuideTimerRef.current)
    }, [])

    const showMobileGestureGuide = useCallback(() => {
        setShowGestureGuide(true)
        if (gestureGuideTimerRef.current != null) window.clearTimeout(gestureGuideTimerRef.current)
        gestureGuideTimerRef.current = window.setTimeout(() => setShowGestureGuide(false), 1800)
    }, [])

    const onMapGestureEnd = useCallback((latLng: number[]) => {
        const runId = ++reverseGeocodeRunRef.current
        setCenter(new LatLng(latLng[0], latLng[1]))
        fetchGeoData(latLng[0], latLng[1])
            .then(results => {
                if (runId !== reverseGeocodeRunRef.current || !results?.features[0]) {
                    return
                }
                const pinnedLocation: GeoSearchResponse = {
                    ...results,
                    features: [{
                        ...results.features[0],
                        geometry: {
                            ...results.features[0].geometry,
                            coordinates: [latLng[1], latLng[0]],
                        },
                    }],
                }
                const nextCenter = new LatLng(latLng[0]!, latLng[1]!)
                setCenter(nextCenter)
                setCenterLocation(pinnedLocation)
                onLocationChange(pinnedLocation)
            })
            .catch(() => {})
    }, [onLocationChange])

    const loc = centerLocation || location
    return (
        <>
            <GeoSearchAutocomplete
                onChange={onSearchChange}
                onClear={() => {
                    setCenterLocation(undefined)
                    onLocationChange(undefined)
                }}
                initial={loc}
            />
            <Box sx={{
                position: "relative",
                width: "100%",
                marginTop: 1,
                aspectRatio: { xs: "1/1", md: "6/7" },
                minHeight: { xs: 320, md: 320 }
            }}><MapContainer
                ref={handleMapRef}
                style={{
                    width: "100%",
                    height: "100%",
                    touchAction: isMobile ? "auto" : "none",
                }}
                center={center}
                zoom={16}
                zoomSnap={0.25}
                dragging={!isMobile}
                touchZoom={!isMobile}
                scrollWheelZoom={true}
                attributionControl={false}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                        opacity={0.99}
                    />
                    {!isMobile && <DesktopMapDragListener onGestureEnd={onMapGestureEnd} />}
                </MapContainer>
                {isMobile && <MobileMapGestureLayer
                    map={map}
                    onGestureEnd={onMapGestureEnd}
                    onSingleTouch={showMobileGestureGuide}
                />}
                <Box
                    component="img"
                    src={markerIcon}
                    alt="Selected location"
                    sx={{
                        position: "absolute",
                        zIndex: 500,
                        width: 25,
                        height: 41,
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -100%)",
                        pointerEvents: "none",
                    }}
                />
                {isMobile && <Box sx={{
                    position: "absolute",
                    zIndex: 650,
                    left: "50%",
                    bottom: 10,
                    transform: "translateX(-50%)",
                    px: 1.25,
                    py: 0.75,
                    bgcolor: "rgba(15, 23, 42, 0.88)",
                    color: "#fff",
                    borderRadius: 1,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    opacity: showGestureGuide ? 1 : 0.82,
                    transition: "opacity 120ms ease",
                }}>
                    Use two fingers to move the map
                </Box>}
                <Tooltip title="Use this map location as your default">
                    <IconButton
                        aria-label="Set default map location"
                        onClick={() => localStorage.setItem(DEFAULT_CENTER_KEY, JSON.stringify([center.lat, center.lng]))}
                        sx={{
                            position: "absolute",
                            zIndex: 600,
                            top: 8,
                            right: 8,
                            bgcolor: "background.paper",
                            boxShadow: 2,
                            "&:hover": { bgcolor: "background.paper" },
                        }}
                    >
                        <AddLocationAltIcon />
                    </IconButton>
                </Tooltip>
                <Typography
                    variant="caption"
                    sx={{
                        display: "block",
                        textAlign: "right",
                        mt: 0.5,
                        color: "text.secondary",
                        fontSize: "0.65rem"
                    }}
                >
                    Map data © OpenStreetMap contributors, © CARTO
                </Typography>
            </Box>
        </>
    )
}
