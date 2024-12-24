import { useState } from 'react'
import logo from './assets/reported.svg'
import './App.css'
import cv from "@techstark/opencv-js";
import * as ExifReader from 'exifreader';
import { fetchGeoData, GeoSearchResponse } from './api/nyc';
import { getFileHash } from './api/file-utils';
import reported, { ReportedKeys } from './Reported';
import { downloadAll, segment } from './api/segment';

function App() {

  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: NaN });

  const [loaded, setLoaded] = useState(false)

  // Handle drag over event (to allow dropping)
  const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle file drop event
  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0]; // Get the first dropped file
    if (file) {
      handleFileChange(e);
    }
  };

  let initialized = false

  cv["onRuntimeInitialized"] = async () => {
    console.log("initialized")
    if(!initialized) {
      initialized = true
    }
    const all = await downloadAll()
    setLoaded(true)
    // console.log(new URL('../public/reported-best.onnx',import.meta.url).href)
    // const arrBufNet = await download(
    //   new URL('../public/reported-best.onnx',import.meta.url).href, // url
    //   ["Loading YOLOv8 Segmentation model", setLoading] // logger
    // );    
    // const ocrBufNet = await download(
    //   new URL('../public/mask-yolov8-seg.onnx',import.meta.url).href, // url
    //   ["Loading YOLOv8 Segmentation model", setLoading] // logger
    // );
    // const plate = await InferenceSession.create(arrBufNet);
    // const ocr = await InferenceSession.create(ocrBufNet);

    // setLoaded(true)
    // console.log(plate,ocr,loading)
  }

  const handleFilesChange = async (e:React.DragEvent<HTMLInputElement>) => {
    handleFiles(e.currentTarget.files)
  }

  const handleFiles = async (filelist:FileList | null) => {
    if(filelist==null) {
      return
    }
    
    const files = Array.from(filelist || [])
    const file = files[0]
    const seg = await segment(file)
    
    const hash = await getFileHash(file)
    console.log("hash", hash)
    const tags = await ExifReader.load(file);
    console.log(tags)
    const {imageDate:DateTimeOriginal} = tags;
    const unprocessedTagValue = tags['DateTimeOriginal']?.value;

    const latitude = 
  tags['GPSLatitudeRef']?.description?.toLowerCase() === 'south latitude' 
    ? -Math.abs(parseFloat(tags['GPSLatitude']?.description || '0')) 
    : parseFloat(tags['GPSLatitude']?.description || '0');

const longitude = 
  tags['GPSLongitudeRef']?.description?.toLowerCase() === 'west longitude' 
    ? -Math.abs(parseFloat(tags['GPSLongitude']?.description || '0')) 
    : parseFloat(tags['GPSLongitude']?.description || '0');
    
    console.log(unprocessedTagValue, latitude,longitude)
    const cachedGeo = reported.get<GeoSearchResponse>(ReportedKeys.Geo, hash)
    const data = cachedGeo ? cachedGeo : await fetchGeoData(latitude, longitude);
    if (data && data?.features?.[0]?.properties?.label?.length > 0) {
      reported.set(ReportedKeys.Geo, data, hash)
    }
  }

  const handleFileChange = async (e:React.ChangeEvent<HTMLInputElement>) => { 
    handleFiles(e.currentTarget.files)
  }
  
  return (
    <>
      <div
        onDragOver={handleDragOver} // Allow dragging over the button
        onDrop={handleDrop} // Handle dropped files
        >
      <div>
        <a href="https://reported-web.herokuapp.com/" target="_blank">
          <img src={logo} className="logo" alt="Reported Logo" />
        </a>
      </div>
      <h1>Reported</h1>
      <div className="card">      
        <p>        
        Loaded: {!Number.isNaN(loading.progress) && loading.progress}%<br/>
        </p>
      </div>
      <p className="read-the-docs">
        <input accept=".jpg, .png, .heif, .heic" type="file" onChange={handleFileChange} />
      </p>
      </div>
    </>
  )
}

export default App
