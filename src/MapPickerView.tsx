import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L, { LatLng } from 'leaflet';
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Feature, fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import Box from '@mui/material/Box';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Icon } from 'leaflet'
import { GeoSearchAutocomplete } from './api/ny/nyc/GeoSearchAutocomplete';

type MapProps = {
    latLng?: number[],
    location?: GeoSearchResponse,
    onLocationChange?: (location: GeoSearchResponse) => void
};

type MarkerProps = {
    center: LatLng,
    children: React.ReactNode,
    onDragEnd: (latLng: number[]) => void
}

const DraggableMarker = ({ center, children, onDragEnd }: MarkerProps) => {
    const [draggable] = useState(true)
    const [position, setPosition] = useState(center)
    const markerRef = useRef<L.Marker>(null)
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current
                if (marker != null) {
                    setPosition(marker.getLatLng())
                    onDragEnd([marker.getLatLng().lat, marker.getLatLng().lng])
                }

            },
        }),
        [],
    )

    useEffect(() => {
        setPosition(center)
    }, [center])

    return (
        <Marker
            draggable={draggable}
            eventHandlers={eventHandlers}
            icon={new Icon({ iconUrl: markerIcon, iconRetinaUrl: markerIconRetina, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] })}
            position={position}
            ref={markerRef}>
            {children}
        </Marker>
    )
}

export const MapPickerView = ({ latLng, location, onLocationChange = () => { } }: MapProps) => {

    const [center, setCenter] = useState<LatLng>(new LatLng(40.76, -73.99))
    const [centerLocation, setCenterLocation] = useState<GeoSearchResponse>()

    const [initial, setInitial] = useState<GeoSearchResponse>()

    const markerRef = React.useRef<L.Marker>(null);

    const [map, setMap] = useState<L.Map>()

    useEffect(() => {
        if (!latLng) {
            return
        }
        const newCenter = new LatLng(latLng[0]!, latLng[1]!)
        if (latLng) {
            setCenter(newCenter)
        }
        setCenterLocation(location)
        setInitial(location)
        if (map) {
            map.setView(newCenter, map.getZoom());
        }
    }
        , [latLng, location])

    useEffect(() => {
        if (markerRef.current && center) {
            markerRef.current.openPopup()
        }
    }, [])

    useEffect(() => {
        if (initial) {
            onLocationChange(initial)
        }
    }, [initial])

    useEffect(() => {
        if (centerLocation) {
            onLocationChange(centerLocation)
        }
    }, [centerLocation])

    const onSearchChange = (resp: GeoSearchResponse, value: Feature) => {
        const reverse = new LatLng(value.geometry.coordinates[1], value.geometry.coordinates[0])
        setCenter(reverse)

        const resp2 = { ...resp }
        resp2.features = [value]
        if (centerLocation != resp2) {
            onLocationChange(resp2)
        }
        setCenterLocation(resp2)

        setInitial(resp2)
        if (map) {
            map.setView(reverse, map.getZoom());
        }
    }

    const onDragEnd = (latLng: number[]) => {
        const fetch = async (): Promise<GeoSearchResponse> => {
            const results = await fetchGeoData(latLng[0], latLng[1])
            console.log(results)
            if (results) {
                return results
            } else {
                throw Error("I dunno")
            }
        }
        fetch()
            .then(ok => {
                setInitial(ok)

            })
    }

    const loc = centerLocation || location
    return (
        <>
            <GeoSearchAutocomplete onChange={onSearchChange} initial={initial} />
            <Box sx={{
                position: "relative",
                width: "100%",
                marginTop: 1,
                aspectRatio: "6/7"
            }}><MapContainer
                ref={(m) => setMap(m as L.Map)}
                style={{
                    width: "100%",
                    height: "100%"
                }}
                center={center}
                zoom={16}
                scrollWheelZoom={true}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <DraggableMarker center={center} onDragEnd={onDragEnd}>
                        <Popup>
                            {loc && <>{loc.features[0].properties.label}<br /><br /></>}
                            {center.lat.toFixed(4)},{center.lng.toFixed(4)}
                        </Popup>
                    </DraggableMarker>
                </MapContainer>
            </Box>
        </>
    )
}