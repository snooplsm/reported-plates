import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet';
import React, { useEffect, useRef, useState } from "react"
import { GeoSearchResponse } from './api/ny/nyc/nyc';
import Box from '@mui/material/Box';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type MapProps = {
    latLng?: Number[],
    location?: GeoSearchResponse
};

export const MapPickerView: React.FC<MapProps> = ({ latLng, location }) => {

    const [center, setCenter] = useState<Number[]>()
    const [centerLocation, setCenterLocation] = useState<GeoSearchResponse>()

    const markerRef = React.useRef<L.Marker>(null);

    const map = useRef<L.Map>()

    useEffect(() => {
        const newCenter = [latLng[1]!,latLng[0]!]
        if(latLng) {
            setCenter(newCenter)
        }
        setCenterLocation(location)
        if(map.current) {
            map.current.setView(newCenter, map.current.getZoom());
        }
    }
    , [latLng, location])

    useEffect(()=> {
        if(markerRef.current && center) {
            markerRef.current.openPopup()
        }
    },[])

    return (
        <>
            {center &&
                <Box sx={{
                    position: "relative",
                    width: "100%",
                    height: "500px"
                }}><MapContainer 
                whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance; // Save the map instance in the ref
                  }}    
                style={{
                    width: "100%",
                    height: "100%"
                }} center={center} zoom={16} scrollWheelZoom={true}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker                         
                        position={center}>
                        <Popup>
                            {centerLocation && <>{centerLocation.features[0].properties.label}<br/><br/></>}
                            {center[0].toFixed(4)},{center[1].toFixed(4)}
                        </Popup>
                    </Marker>
                </MapContainer>
                </Box>
            }
        </>
    )
}