import { useState } from 'react'
import logo from './assets/reported.svg'
import './App.css'
import { InferenceSession }from 'onnxruntime-web/webgpu';
import { download } from './utils/download';
import cv from "@techstark/opencv-js";

function App() {

  const [loading, setLoading] = useState({ text: "Loading OpenCV.js", progress: NaN });

  const [loaded, setLoaded] = useState(false)

  console.log(import.meta.url)

  cv["onRuntimeInitialized"] = async () => {

    console.log(new URL('../public/reported-best.onnx',import.meta.url).href)
    const arrBufNet = await download(
      new URL('../public/reported-best.onnx',import.meta.url).href, // url
      ["Loading YOLOv8 Segmentation model", setLoading] // logger
    );    
    const ocrBufNet = await download(
      new URL('../public/mask-yolov8-seg.onnx',import.meta.url).href, // url
      ["Loading YOLOv8 Segmentation model", setLoading] // logger
    );
    const plate = await InferenceSession.create(arrBufNet);
    const ocr = await InferenceSession.create(ocrBufNet);

    setLoaded(true)
    console.log(plate,ocr,loading)
  }
  
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={logo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>Reported</h1>
      <div className="card">      
        <p>        
        Loaded: {!Number.isNaN(loading.progress) && loading.progress}%<br/>
        </p>
      </div>
      <p className="read-the-docs">
        
      </p>
    </>
  )
}

export default App
