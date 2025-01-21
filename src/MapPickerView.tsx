import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Feature, fetchGeoData, GeoSearchResponse } from './api/ny/nyc/nyc';
import Box from '@mui/material/Box';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {GeoSearchAutocomplete} from './api/ny/nyc/GeoSearchAutocomplete';

type MapProps = {
    latLng?: number[],
    location?: GeoSearchResponse
};

type MarkerProps = {
    center: number[],
    children: React.ReactNode,
    onDragEnd: (latLng:number[])=>void
}

const DraggableMarker = ({ center, children, onDragEnd }: MarkerProps) => {
    const [draggable, setDraggable] = useState(true)
    const [position, setPosition] = useState(center)
    const markerRef = useRef(null)
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current
                if (marker != null) {
                    setPosition(marker.getLatLng())
                    onDragEnd([marker.getLatLng().lat,marker.getLatLng().lng])
                }
                
            },
        }),
        [],
    )

    useEffect(()=> {
        setPosition(center)
    }, [center])

    return (
        <Marker
            draggable={draggable}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}>
            {children}
        </Marker>
    )
}

export const MapPickerView = ({ latLng, location }:MapProps) => {

    const [center, setCenter] = useState([40.76, -73.99])
    const [centerLocation, setCenterLocation] = useState<GeoSearchResponse>()

    const [initial, setInitial] = useState<GeoSearchResponse>()

    const markerRef = React.useRef<L.Marker>(null);

    const [map, setMap] = useState<L.Map>()

    useEffect(() => {
        if (!latLng) {
            return
        }
        const newCenter = [latLng[0]!, latLng[1]!]
        if (latLng) {
            setCenter(newCenter)
        }
        setCenterLocation(location)
        setInitial(location)
        map.setView(newCenter, map.getZoom());
    }
    , [latLng, location])

    useEffect(() => {
        if (markerRef.current && center) {
            markerRef.current.openPopup()
        }
    }, [])

    const onSearchChange = (resp: GeoSearchResponse, value: Feature) => {
        const reverse = [value.geometry.coordinates[1], value.geometry.coordinates[0]]
        setCenter(reverse)

        const resp2 = { ...resp }
        resp2.features = [value]
        setCenterLocation(resp2)
        setInitial(resp2)
        map.setView(reverse, map.getZoom());
    }

    const onDragEnd = (latLng:number[]) => {
        const fetch = async (): Promise<GeoSearchResponse> => {
            const results = await fetchGeoData(latLng[0],latLng[1])
            console.log(results)
            if(results) {
                return results
            } else {
                throw Error("I dunno")
            }
        }
        fetch()
        .then(ok=> {
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
                ref={setMap}
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
                            {centerLocation && <>{centerLocation.features[0].properties.label}<br /><br /></>}
                            {location && <>{location.features[0].properties.label}<br /><br /></>}
                            {center[0].toFixed(4)},{center[1].toFixed(4)}
                        </Popup>
                    </DraggableMarker>
                </MapContainer>
            </Box>
        </>
    )
}