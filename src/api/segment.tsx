import { InferenceSession, Tensor, env } from "onnxruntime-web";
import { download } from "../utils/download";
import cv, { Mat } from "@techstark/opencv-js";
import { yoloClassIndexToLabel, yoloSegClasses, yoloSegIndexToLabel, yoloSegVehicles } from "../labels";
import heic2any from "heic2any";
import { State } from "../States";

const models = [
    ['segment', 'yolov8n-seg'],
    ['nms', 'nms-yolov8'],
    ['mask', 'mask-yolov8-seg'],
    ['plate', 'yolo-v9-t-640-license-plates-end2end'],
    ['plate-class', 'reported-plate-class-best'],
    ['ocr', 'global_mobile_vit_v2_ocr']
]

env.wasm.wasmPaths = import.meta.env.BASE_URL

let downloaded = false

let downloading: Promise<void> | null = null;

let yolo: InferenceSession
let nms: InferenceSession
let plate: InferenceSession
let ocr: InferenceSession
let plateClass: InferenceSession

const topk = 100;
const iouThreshold = 0.4;
const scoreThreshold = 0.2;

export const downloadAll = async (setLoading: unknown) => {
    if (downloaded) {
        return
    }
    if (downloading) {
        return downloading
    }
    const promises: Promise<ArrayBuffer>[] = [];
    models.forEach(([type, modelName]) => {
        const url = `${import.meta.env.BASE_URL}models/${modelName}.onnx`
        promises.push(download(
            url,
            [type,
                () => setLoading]
        ))
    })
    downloading = Promise.all(promises).then(async result => {        
        yolo = await InferenceSession.create(result[0]);
        nms = await InferenceSession.create(result[1]);
        plate = await InferenceSession.create(result[3]);
        plateClass = await InferenceSession.create(result[4])
        ocr = await InferenceSession.create(result[5]);
        downloaded = true
        downloading = null
    }).catch(console.log)
    return downloading
}

// const arrBufNet = await download(
//     new URL('../public/reported-best.onnx',import.meta.url).href, // url
//     ["Loading YOLOv8 Segmentation model", ()=> {}] // logger
// );    
// const ocrBufNet = await download(
//     new URL('../public/mask-yolov8-seg.onnx',import.meta.url).href, // url
//     ["Loading YOLOv8 Segmentation model", ()=>{}] // logger
// );
// const plate = await InferenceSession.create(arrBufNet);
// const ocr = await InferenceSession.create(ocrBufNet);

/**
 * Get divisible image size by stride
 * @param {Number} stride
 * @param {Number} width
 * @param {Number} height
 * @returns {Number[2]} image size [w, h]
 */
const divStride = (stride: number, width: number, height: number) => {
    if (width % stride !== 0) {
        if (width % stride >= stride / 2) width = (Math.floor(width / stride) + 1) * stride;
        else width = Math.floor(width / stride) * stride;
    }
    if (height % stride !== 0) {
        if (height % stride >= stride / 2) height = (Math.floor(height / stride) + 1) * stride;
        else height = Math.floor(height / stride) * stride;
    }
    return [width, height];
};



export const segment = async (file: File): Promise<DetectBox[]> => {
    return new Promise<DetectBox[]>(async (resolve) => {
        await downloadAll(()=>{})
        const image = new Image()
        let file2Use:string
        if(file.type.toLowerCase()==="image/heic") {
            const uuu = URL.createObjectURL(file)
            try {
            const blob:Blob = await (await fetch(uuu)).blob()
            const converted = await heic2any({blob,
                toType: "image/jpeg"
            })
            file2Use = URL.createObjectURL(converted)
            } catch(e) {
                console.log(e)
            }
        } else {
            file2Use = URL.createObjectURL(file)
        }
        image.src = file2Use

        image.onerror = (err) => {
            console.log(err)
        }
        image.onload = async () => {
            const modelInputShape = [1, 3, 640, 640];
            const src = cv.imread(image)
            const modelWidth = modelInputShape[2];
            const modelHeight = modelInputShape[3];
            const matC3 = new cv.Mat(src.rows, src.cols, cv.CV_8UC3); // new image matrix
            cv.cvtColor(src, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR
            const [w, h] = divStride(32, matC3.cols, matC3.rows);
            cv.resize(matC3, matC3, new cv.Size(w, h))
            const maxSize = Math.max(matC3.rows, matC3.cols)
            const xPad = maxSize - matC3.cols;
            const xRatio = maxSize / matC3.cols;
            const yPad = maxSize - matC3.rows;
            const yRatio = maxSize / matC3.rows;
            const width_scale = image.width / modelWidth
            const height_scale = image.height / modelHeight
            const matPad = new cv.Mat();
            cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT)
            const input = cv.blobFromImage(matPad,
                1 / 255.0,
                new cv.Size(modelWidth, modelHeight),
                new cv.Scalar(0, 0, 0),
                true,
                false
            )
            // src.delete();
            matC3.delete();
            matPad.delete();
            // URL.revokeObjectURL(image.src);

            const tensor = new Tensor("float32", input.data32F, modelInputShape);
            const config = new Tensor("float32", new Float32Array(
                [
                    yoloSegClasses,
                    topk,
                    iouThreshold,
                    scoreThreshold
                ]
            ))

            const { output0 } = await yolo.run({ images: tensor }); // run session and get output layer. out1: detect layer, out2: seg layer

            const { selected } = await nms.run({ detection: output0, config: config }); // perform nms and filter boxes

            const numClass = yoloSegClasses

            let boxes: DetectBox[] = []; // ready to draw boxes
            // looping through output
            for (let idx = 0; idx < selected.dims[1]; idx++) {
                const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]) as Float32Array; // get rows
                let abox = data.slice(0, 4); // det boxes
                const scores = data.slice(4, 4 + numClass); // det classes probability scores
                const score = Math.max(...scores); // maximum probability scores
                const label = scores.indexOf(score); // class id of maximum probability scores
                if (!yoloSegVehicles.has(label)) {
                    continue
                }
                let box:[x:number,y:number,w:number,h:number] = overflowBoxes(
                    [
                        abox[0] - 0.5 * abox[2], // before upscale x
                        abox[1] - 0.5 * abox[3], // before upscale y
                        abox[2], // before upscale w
                        abox[3], // before upscale h
                    ],
                    maxSize
                ); // keep boxes in maxSize range

                const [x, y, w, h] = overflowBoxes(
                    [
                        Math.floor(box[0] * xRatio), // upscale left
                        Math.floor(box[1] * yRatio), // upscale top
                        Math.floor(box[2] * xRatio), // upscale width
                        Math.floor(box[3] * yRatio), // upscale height
                    ],
                    maxSize
                ); // upscale boxes

                const scaled:[x:number,y:number,w:number,h:number] = [
                    x * width_scale,
                    y * height_scale,
                    w * width_scale,
                    h * height_scale
                ]       
                if(scaled[0]+scaled[2]>src.cols) {
                    scaled[2] = src.cols - scaled[0]
                }     
                if(scaled[1]+scaled[3]>src.rows) {
                    scaled[3] = src.rows - scaled[1]
                }
                if (score >= .5 && w>60 && h>60) {
                    boxes.push({
                        file: file,
                        label: yoloSegIndexToLabel[label],
                        index: label,
                        probability: score,
                        data: data,
                        car: null,
                        plate: null,
                        mask: data.slice(4 + numClass),
                        bounding: [x, y, w, h], // upscale box,
                        scaled: scaled,
                        box: box
                    }); // update boxes to draw later
                }
            }
            boxes = boxes.sort((a, b) => {
                // Image center
                const centerX = modelWidth / 2;
                const centerY = modelHeight / 2;
            
                // Box A center
                const centerAX = (a.scaled[0] + a.scaled[2]) / 2; // x_center
                const centerAY = (a.scaled[1] + a.scaled[3]) / 2; // y_center
            
                // Box B center
                const centerBX = (b.scaled[0] + b.scaled[2]) / 2; // x_center
                const centerBY = (b.scaled[1] + b.scaled[3]) / 2; // y_center
            
                // Calculate distances to center
                const distanceA = Math.sqrt(Math.pow(centerAX - centerX, 2) + Math.pow(centerAY - centerY, 2));
                const distanceB = Math.sqrt(Math.pow(centerBX - centerX, 2) + Math.pow(centerBY - centerY, 2));
            
                // Area of the boxes
                const areaA = a.scaled[2] * a.scaled[3];
                const areaB = b.scaled[2] * b.scaled[3];
            
                // If distances are close, sort by area; otherwise, sort by distance
                if (Math.abs(distanceA - distanceB) < 50) {
                    return areaB - areaA; // Larger area comes first
                } else {
                    return distanceA - distanceB; // Closer distance comes first
                }
            });
            for (const box of boxes) {
                const [x, y, w, h] = box.scaled
                const rect = new cv.Rect(x, y, w, h)
                const roi = src.roi(rect).clone()
                let canvas = document.createElement('canvas') as HTMLCanvasElement;
                let ctx = canvas.getContext('2d') as CanvasRenderingContext2D
                let imgData = new ImageData(
                    new Uint8ClampedArray(roi.data),
                    roi.cols,
                    roi.rows
                );
                canvas.width = imgData.width;
                canvas.height = imgData.height;
                ctx.putImageData(imgData, 0, 0);
                const blob = await canvasToBlob(canvas)
                canvas.remove()
                box.car = blob
                const url = URL.createObjectURL(blob);

                // Create a hidden <a> element to trigger the download
                const link = document.createElement("a");
                link.href = url;
                link.download = "car.jpg";
                // link.click()
                URL.revokeObjectURL(url)
                const letter = letterbox(roi, [640,640])
                roi.delete()
                // await downloadMatAsImage(letter.image)
                const tensor = await matToOnnxTensor(letter.image)
                // matC3.delete()
                // matPad.delete()
                // const tensor = new Tensor("float32", input, modelInputShape);
                const { output0: predictions } = await plate.run({
                    images: tensor
                })
                const padding = letter.pad
                const ratio = letter.scale
                const result = convertToDetectionResult(predictions.data as Float32Array, ['plate','fuhghedaboutit'], ratio, padding)
                for(const k of result) {
                    if(k.confidence> .2) {
                        box.plate = {
                            box: [k.boundingBox.x1,k.boundingBox.y1,k.boundingBox.x2,k.boundingBox.y2],
                            probability: k.confidence                        
                        }
                        let [cropX, cropY, cropWidth, cropHeight] = [
                            k.boundingBox.x1, k.boundingBox.y1, k.boundingBox.x2-k.boundingBox.x1, k.boundingBox.y2-k.boundingBox.y1
                        ]
                    
                        const rect = new cv.Rect(cropX, cropY, cropWidth, cropHeight)
                        let roi: cv.Mat;
                        const roid = await blobToMat(box.car as Blob);
                        try {                            
                            roi = roid.roi(rect).clone();
                            roid.delete()
                        } catch (e) {
                            console.log(e);
                            roi = roid; // Fallback to the original `roid` if the `roi` operation fails

                        }
                        let canvas = document.createElement('canvas') as HTMLCanvasElement;
                        let ctx = canvas.getContext('2d') as CanvasRenderingContext2D
                        let imgData = new ImageData(
                            new Uint8ClampedArray(roi.data),
                            roi.cols,
                            roi.rows
                        );                        
                        canvas.width = imgData.width;
                        canvas.height = imgData.height;
                        ctx.putImageData(imgData, 0, 0);
                        const blob = await canvasToBlob(canvas)
                        box.plate.image = blob
                        canvas.remove()
                        box.plate.image = blob
                        const url = URL.createObjectURL(blob);

                        // Create a hidden <a> element to trigger the download
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "plate.jpg";
                        // Trigger the download
                        // link.click();

                        // Clean up the temporary URL
                        URL.revokeObjectURL(url);        
                        
                        const blur = new cv.Mat()
                        cv.medianBlur(roi, blur, 3)
                        const edges = new cv.Mat()
                        cv.Canny(blur, edges, 30, 100, 3, true)
                        const lines = new cv.Mat()
                        const rho = 1; // Distance resolution in pixels
                        const theta = Math.PI / 180; // Angle resolution in radians
                        const threshold = 30; // Accumulator threshold
                        const minLineLength = roi.rows / 4.0; // Minimum line length
                        const maxLineGap = roi.cols / 4.0; // Maximum gap between lines
                        try {
                            cv.HoughLines(edges, lines, rho, theta, threshold, minLineLength, maxLineGap);
                        } catch (e) {
                            console.log(e)
                        }
                        let angle = 0.0
                        let nlines = lines.size
                        let cnt = 0
                        if (lines instanceof cv.Mat && lines.rows > 0) {
                            for (let i = 0; i < lines.rows; i++) {
                                const x1 = lines.data32S[i * 4];
                                const y1 = lines.data32S[i * 4 + 1];
                                const x2 = lines.data32S[i * 4 + 2];
                                const y2 = lines.data32S[i * 4 + 3];
                        
                                // Calculate the angle
                                const ang = Math.atan2(y2 - y1, x2 - x1);
                        
                                // Exclude extreme rotations (30 degrees threshold converted to radians)
                                if (Math.abs(ang) <= 40 * (Math.PI / 180)) {
                                    angle += ang;
                                    cnt += 1;
                                }
                            }
                        }
                        lines.delete()
                        edges.delete()
                        if(cnt==0) {
                            angle = 0.0
                        }
                        if(angle!=0.0) {
                            // const center = new cv.Point(roi.rows/2,roi.cols/2)
                            // const rotate = cv.getRotationMatrix2D(center, -angle, 1.0)
                            // cv.warpAffine(roi, roi, rotate, new cv.Size(roi.cols,roi.rows), cv.INTER_LINEAR)
                        }
                        console.log("the nagle is ", angle)
                                    

                        const src = await blobToMat(blob)
                        const matC3 = new cv.Mat(); // new image matrix
                        cv.cvtColor(src, matC3, cv.COLOR_BGR2GRAY); // RGBA to BGR
                        const [w3, h3] = divStride(32, matC3.cols, matC3.rows);
                        cv.resize(matC3, matC3, new cv.Size(w3, h3))
                        const maxSize = Math.max(matC3.rows, matC3.cols)
                        const xPad = maxSize - matC3.cols;
                        // const xRatio = maxSize / matC3.cols;
                        const yPad = maxSize - matC3.rows;
                        // const yRatio = maxSize / matC3.rows;
                        // const width_scale1 = src.cols / 140
                        // const height_scale1 = src.rows / 70
                        const matPad = matC3.clone()
                        // cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT)
                        cv.resize(matPad, matPad, new cv.Size(140, 70))

                        const input = new Uint8Array(matPad.data);
                        // src.delete();
                        roi.delete()
                        matC3.delete();
                        matPad.delete();
                        const slots = 8
                        const tensorShape = [slots, 70, 140, 1];
                        const tensorData = new Uint8Array(slots * 70 * 140 * 1);

                        // Fill the tensorData with the image data (supports batch if needed)
                        for (let i = 0; i < input.length; i++) {
                            tensorData[i] = input[i];
                        }
                        const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_"
                        // Create the tensor
                        const tensor = new Tensor("uint8", tensorData, tensorShape);
                        const { concatenate } = await ocr.run({ input: tensor })
                        console.log("concat", concatenate.data)
                        // const totalElements = concatenate.data.length;
                        const alphabetLength = alphabet.length;
                        const batchSize = slots * alphabetLength;
                        const reshaped = concatenate
                        const data = reshaped.data; // Access the raw data as a Float32Array
                        const platesWithProbabilities = [];

                        for (let b = 0; b < batchSize; b++) {
                            const batchStart = b * slots * alphabetLength;
                            const batchIndices: number[] = [];
                            const slotProbabilities: number[] = [];

                            for (let s = 0; s < slots; s++) {
                                const slotStart = batchStart + s * alphabetLength;
                                // Ensure slotData is typed as number[]
                                const slotData: number[] = Array.from(data.slice(slotStart, slotStart + alphabetLength) as Float32Array);

                                // Use reduce to find the index of the maximum value
                                const maxIndex = slotData.reduce((maxIdx: number, value: number, idx: number) =>
                                    value > slotData[maxIdx] ? idx : maxIdx, 0
                                );

                                // Get the probability of the max index
                                const maxValue = Math.max(...slotData);

                                batchIndices.push(maxIndex); // Store the character index
                                slotProbabilities.push(maxValue); // Store the slot's probability
                            }

                            // Step 3: Convert indices to characters
                            const plateChars = batchIndices.map(index => alphabet[index]);
                            const plate = plateChars.join("");

                            // Calculate overall plate probability (average)
                            const averageProbability = slotProbabilities.reduce((a, b) => a + b, 0) / slotProbabilities.length;

                            // Add to platesWithProbabilities array
                            platesWithProbabilities.push({
                                plate, // Plate string
                                probabilities: slotProbabilities, // Individual slot probabilities
                                averageProbability, // Average probability of the plate
                            });
                        }

                        // Step 4: Output
                        console.log("Plates with Probabilities:", platesWithProbabilities);
                        

                        // console.log(concatenate)
                        //MAGIC

                        const matC4 = await blobToMat(blob)
                        // cv.cvtColor(src, matC4, cv.COLOR_RGBA2BGR); // RGBA to BGR
                        cv.resize(matC4, matC4, new cv.Size(160, 160), 0, 0, cv.INTER_LINEAR);
                        matC4.convertTo(matC4, cv.CV_32F, 1 / 255.0); // Normalize to [0, 1]       
                        cv.cvtColor(matC4, matC4, cv.COLOR_RGBA2RGB);

                        const plateClassTensor = new Tensor("float32", matC4.data32F, [1, 3, 160, 160]);
                        const res = await plateClass.run({ images: plateClassTensor });
                        const outputTensor = res["output0"]
                        const data2 = outputTensor.data as Float32Array; // Access the raw data
                        const batchSize2 = outputTensor.dims[0]; // Should be 1 for this case
                        // const outputLength = outputTensor.dims[1]; // Should be 7 for this case

                        if (batchSize2 !== 1) {
                            throw new Error("Batch size other than 1 is not supported");
                        }

                        // Assuming data is [x_center, y_center, width, height, class_prob_1, class_prob_2, ...]
                        const xCenter = data2[0];
                        const yCenter = data2[1];
                        const width = data2[2];
                        const height = data2[3];

                        // Class probabilities start from index 4
                        const classProbabilities = data2.slice(4);

                        // Get the most likely class index and probability
                        const maxProbIndex = classProbabilities.reduce(
                            (maxIdx, value, idx, array) => (value > array[maxIdx] ? idx : maxIdx),
                            0
                        );
                        const label = maxProbIndex + 4
                        const maxProbability = classProbabilities[maxProbIndex];

                        // Log the decoded results
                        console.log("Bounding Box:");
                        console.log(`  x_center: ${xCenter}, y_center: ${yCenter}`);
                        console.log(`  width: ${width}, height: ${height}`);
                        console.log(`Most likely class index: ${label}, ${yoloClassIndexToLabel[label]}`);
                        console.log(`Probability of the class: ${maxProbability}`);
                        const plateProb = platesWithProbabilities[0] || null
                        
                        if(box.plate) {
                            const plate = box.plate
                            plate.text = plateProb.plate.split("").filter(x=>x!=='_').join("")
                            plate.textWithUnderscores = plateProb.plate
                            plate.textAvgProb = plateProb.averageProbability
                            plate.textLetterProb = plateProb.probabilities
                            plate.state = yoloClassIndexToLabel[label].split("_")[0]
                            plate.tlc = yoloClassIndexToLabel[label].endsWith("_TLC")
                            plate.nypd = yoloClassIndexToLabel[label].endsWith("_PD")
                            plate.stateConfidence = maxProbability

                            if (plate.text.startsWith('T') && plate.text.endsWith('C')) {
                                plate.text = plate.text.replace(/I/g, '1');
                                plate.text = plate.text.replace(/L/g, '1');
                                plate.text = plate.text.replace(/Z/g, '2');
                                plate.text = plate.text.replace(/G/g, '6');
                                plate.text = plate.text.replace(/B/g, '8');
                                plate.text = plate.text.replace(/A/g, '4');
                                plate.text = plate.text.replace(/O/g, '0');
                                plate.state = State.NY
                                plate.tlc = true
                            }
                        }
                    }
                }
            }
            if (src) {
                src.delete()
            }
            boxes = boxes.sort((a, b) => {
                const aHasText = a.plate?.text ? 1 : 0;
                const bHasText = b.plate?.text ? 1 : 0;
              
                // If both or neither have `plate.text`, maintain their relative order
                if (aHasText === bHasText) {
                  return 0; // No change in order
                }
              
                // Prioritize items with `plate.text`
                return bHasText - aHasText; // Higher value (bHasText) comes first
            })
            resolve(boxes)
            console.log(boxes)
        }

    })
};

export function refinePlateForTLC(plateText:string): [string, boolean] {
    let tlc = false
    if (plateText?.startsWith('T') && plateText.endsWith('C') && plateText.length==7) {
        plateText = plateText.replace(/I/g, '1');
        plateText = plateText.replace(/L/g, '1');
        plateText = plateText.replace(/Z/g, '2');
        plateText = plateText.replace(/G/g, '6');
        plateText = plateText.replace(/B/g, '8');
        plateText = plateText.replace(/A/g, '4');
        plateText = plateText.replace(/O/g, '0');
        tlc = true
    }
    return [plateText, tlc]
}

export async function detectPlate(matC3:Mat): Promise<PlateDetection> {
    await downloadAll(()=>{})
    const matC4 = matC3.clone()
    const matPad = matC4.clone()
    cv.cvtColor(matPad, matPad, cv.COLOR_RGBA2GRAY); // RGBA to BGR
    // cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT)
    cv.resize(matPad, matPad, new cv.Size(140, 70))

    const input = new Uint8Array(matPad.data);
    // matPad.delete()
    const slots = 8
    const tensorShape = [slots, 70, 140, 1];
    const tensorData = new Uint8Array(slots * 70 * 140 * 1);

    // Fill the tensorData with the image data (supports batch if needed)
    for (let i = 0; i < input.length; i++) {
        tensorData[i] = input[i];
    }
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_"
    // Create the tensor
    const tensor = new Tensor("uint8", tensorData, tensorShape);
    const { concatenate } = await ocr.run({ input: tensor })
    console.log("concat", concatenate.data)
    // const totalElements = concatenate.data.length;
    const alphabetLength = alphabet.length;
    const batchSize = slots * alphabetLength;
    const reshaped = concatenate
    const data = reshaped.data; // Access the raw data as a Float32Array
    const platesWithProbabilities = [];

    for (let b = 0; b < batchSize; b++) {
        const batchStart = b * slots * alphabetLength;
        const batchIndices: number[] = [];
        const slotProbabilities: number[] = [];

        for (let s = 0; s < slots; s++) {
            const slotStart = batchStart + s * alphabetLength;
            // Ensure slotData is typed as number[]
            const slotData: number[] = Array.from(data.slice(slotStart, slotStart + alphabetLength) as Float32Array);

            // Use reduce to find the index of the maximum value
            const maxIndex = slotData.reduce((maxIdx: number, value: number, idx: number) =>
                value > slotData[maxIdx] ? idx : maxIdx, 0
            );

            // Get the probability of the max index
            const maxValue = Math.max(...slotData);

            batchIndices.push(maxIndex); // Store the character index
            slotProbabilities.push(maxValue); // Store the slot's probability
        }

        // Step 3: Convert indices to characters
        const plateChars = batchIndices.map(index => alphabet[index]);
        const plate = plateChars.join("");
        // Calculate overall plate probability (average)
        const averageProbability = slotProbabilities.reduce((a, b) => a + b, 0) / slotProbabilities.length;

        // Add to platesWithProbabilities array
        platesWithProbabilities.push({
            plate, // Plate string
            probabilities: slotProbabilities, // Individual slot probabilities
            averageProbability, // Average probability of the plate
        });
    }
    // cv.cvtColor(src, matC4, cv.COLOR_RGBA2BGR); // RGBA to BGR
    cv.cvtColor(matC4, matC4, cv.COLOR_BGR2RGB);
    cv.resize(matC4, matC4, new cv.Size(160, 160), 0, 0, cv.INTER_LINEAR);
    matC4.convertTo(matC4, cv.CV_32F, 1 / 255.0); // Normalize to [0, 1]       
    

    // let chwArray = new Float32Array(1 * 3 * 160 * 160);
    // let channels = new cv.MatVector();
    // cv.split(matC4, channels);

    // for (let c = 0; c < 3; c++) {
    //     let channelData = channels.get(c).data32F;
    //     chwArray.set(channelData, c * 160 * 160);
    // }

    const plateClassTensor = new Tensor("float32", matC4.data32F, [1, 3, 160, 160]);
    const res = await plateClass.run({ images: plateClassTensor });
    const outputTensor = res["output0"]
    const data2 = outputTensor.data as Float32Array; // Access the raw data
    const batchSize2 = outputTensor.dims[0]; // Should be 1 for this case
    // const outputLength = outputTensor.dims[1]; // Should be 7 for this case

    if (batchSize2 !== 1) {
        throw new Error("Batch size other than 1 is not supported");
    }

    // Assuming data is [x_center, y_center, width, height, class_prob_1, class_prob_2, ...]
    const xCenter = data2[0];
    const yCenter = data2[1];
    const width = data2[2];
    const height = data2[3];

    // Class probabilities start from index 4
    const classProbabilities = data2.slice(4);

    // Get the most likely class index and probability
    const maxProbIndex = classProbabilities.reduce(
        (maxIdx, value, idx, array) => (value > array[maxIdx] ? idx : maxIdx),
        0
    );
    const label = maxProbIndex + 4
    const maxProbability = classProbabilities[maxProbIndex];

    // Log the decoded results
    // console.log("Bounding Box:");
    // console.log(`  x_center: ${xCenter}, y_center: ${yCenter}`);
    // console.log(`  width: ${width}, height: ${height}`);
    // console.log(`Most likely class index: ${label}, ${yoloClassIndexToLabel[label]}`);
    // console.log(`Probability of the class: ${maxProbability}`);
    const plateProb = platesWithProbabilities[0] || null
    const plate = {} as PlateDetection
    plate.text = plateProb.plate.split("").filter(x=>x!=='_').join("")
    plate.textWithUnderscores = plateProb.plate
    plate.textAvgProb = plateProb.averageProbability
    plate.textLetterProb = plateProb.probabilities
    plate.state = yoloClassIndexToLabel[label].split("_")[0]
    plate.tlc = yoloClassIndexToLabel[label].endsWith("_TLC")
    plate.nypd = yoloClassIndexToLabel[label].endsWith("_PD")
    plate.stateConfidence = maxProbability
    plate.image = await matToBlob(matC3)
    if (plate.text.startsWith('T') && plate.text.endsWith('C')) {
        plate.text = plate.text.replace(/I/g, '1');
        plate.text = plate.text.replace(/L/g, '1');
        plate.text = plate.text.replace(/Z/g, '2');
        plate.text = plate.text.replace(/G/g, '6');
        plate.text = plate.text.replace(/B/g, '8');
        plate.text = plate.text.replace(/A/g, '4');
        plate.text = plate.text.replace(/O/g, '0');
        plate.tlc = true
        plate.state = State.NY
    }
    console.log(plate)
    matC4.delete()
    return plate
}

function detectPrimaryColor(image:Mat) {
    let lower = [175, 118, 30, 0];
    let higher = [255, 195, 25, 255];
    let dst = new cv.Mat();
    let low = new cv.Mat(image.rows, image.cols, image.type(), lower);
    let high = new cv.Mat(image.rows, image.cols, image.type(), higher);
    cv.inRange(image, low, high, dst);
    const count = cv.countNonZero(dst)
    if(count>30) {
        return "Orange"
    } else {
        return "White"
    }
    dst.delete(); low.delete(); high.delete(); 
}

type BoundingBox = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
};

type DetectionResult = {
    label: string;
    confidence: number;
    boundingBox: BoundingBox;
};

/**
 * Convert raw model output into a list of detection result objects.
 * 
 * @param predictions - Model predictions in the form [X, x1, y1, x2, y2, class_id, score].
 * @param classLabels - List of class labels corresponding to the class IDs.
 * @param ratio - Scaling ratio used during preprocessing.
 * @param padding - Tuple of padding values (dw, dh) added during preprocessing.
 * @param scoreThreshold - Minimum confidence score to include a detection result.
 * @returns A list of DetectionResult objects.
 */
function convertToDetectionResult(
    predictions: Float32Array,
    classLabels: string[],
    ratio: [number, number],
    padding: [number, number],
    scoreThreshold: number = 0.5
): DetectionResult[] {
    const results: DetectionResult[] = [];
    const numDetections = predictions.length / 7;

    for (let i = 0; i < numDetections; i++) {
        const startIndex = i * 7;

        // Extract bounding box, class ID, and score
        const bbox = [
            predictions[startIndex + 1],
            predictions[startIndex + 2],
            predictions[startIndex + 3],
            predictions[startIndex + 4],
        ];
        const classId = Math.floor(predictions[startIndex + 5]);
        const score = predictions[startIndex + 6];

        // Only include results that meet the score threshold
        if (score < scoreThreshold) continue;

        console.log("ratioX:", ratio[0], "ratioY:", ratio[1]);
        console.log("paddingX:", padding[0], "paddingY:", padding[1]);
        console.log("x1:", bbox[0], "x2:", bbox[1], "y1:", bbox[2], "y2:", bbox[3]);

        // Adjust bounding box from scaled image back to original image size
        bbox[0] = (bbox[0] - padding[0]) / ratio[0];
        bbox[1] = (bbox[1] - padding[1]) / ratio[1];
        bbox[2] = (bbox[2] - padding[0]) / ratio[0];
        bbox[3] = (bbox[3] - padding[1]) / ratio[1];

        // Map class_id to label if available
        const label = classLabels[classId] || String(classId);

        // Create detection result object
        const boundingBox: BoundingBox = {
            x1: Math.round(bbox[0]),
            y1: Math.round(bbox[1]),
            x2: Math.round(bbox[2]),
            y2: Math.round(bbox[3]),
        };

        const detectionResult: DetectionResult = {
            label: label,
            confidence: parseFloat(score.toFixed(6)),
            boundingBox: boundingBox,
        };

        results.push(detectionResult);
    }

    return results;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob); // Resolve the Promise with the Blob
            } else {
                reject(new Error("Blob creation failed"));
            }
        }, type, quality);
    });
}

// Function to convert cv.Mat to ONNX tensor
function matToOnnxTensor(mat:Mat, modelInputShape = [1, 3, 640, 640]): Tensor {
    const [batchSize, channels, height, width] = modelInputShape;

    // Ensure the Mat has 3 channels (BGR to RGB if needed)
    if (mat.channels() !== 3) {
        throw new Error("Mat must have 3 channels (RGB/BGR) for this operation.");
    }

    // Resize to the desired shape (e.g., 160x160)
    const resizedMat = new cv.Mat();
    cv.resize(mat, resizedMat, new cv.Size(width, height), 0, 0, cv.INTER_LINEAR);

    // Normalize pixel values to [0, 1]
    const floatArray = new Float32Array(height * width * channels);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = resizedMat.ucharPtr(y, x); // Get pixel at (x, y)
            const idx = (y * width + x) * channels;
            floatArray[idx] = pixel[0] / 255.0; // Red (or Blue if BGR)
            floatArray[idx + 1] = pixel[1] / 255.0; // Green
            floatArray[idx + 2] = pixel[2] / 255.0; // Blue (or Red if BGR)
        }
    }

    // Free the resized Mat to avoid memory leaks
    resizedMat.delete();

    // Reshape data to [batch_size, channels, height, width]
    const reshapedArray = new Float32Array(batchSize * channels * height * width);
    for (let c = 0; c < channels; c++) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idxReshaped = c * height * width + y * width + x;
                const idxFlat = (y * width + x) * channels + c;
                reshapedArray[idxReshaped] = floatArray[idxFlat];
            }
        }
    }

    // Create ONNX Tensor
    return new Tensor("float32", reshapedArray, [batchSize, channels, height, width]);
}

async function matToBlob(roi:Mat):Promise<Blob> {
    const mat = new cv.Mat()
    cv.cvtColor(roi,mat,cv.COLOR_RGB2RGBA)
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.width = mat.cols;
    canvas.height = mat.rows;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const imageData = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
    ctx.putImageData(imageData, 0, 0);  
    mat.delete()
    // Convert the canvas to a Blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, "image/jpeg"); // You can specify the image format (e.g., JPEG or PNG)
    });
}

async function matToImage(roi:Mat): Promise<Blob> {
    let canvas = document.createElement('canvas') as HTMLCanvasElement;
    let ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    let imgData = new ImageData(
        new Uint8ClampedArray(roi.data),
        roi.cols,
        roi.rows
    );                        
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    ctx.putImageData(imgData, 0, 0);
    const blob = await canvasToBlob(canvas)
    return blob
}

async function blobToMat(blob: Blob): Promise<Mat> {
    return new Promise(async (resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                try {
                    const mat = cv.imread(img); // Read directly from <img>
                    resolve(mat); // Return the cv.Mat
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = (err) => reject(err);
            const sr = reader.result as string
            if(!sr) {
                reject(new Error("data is empty"))
            }
            img.src = sr
        };

        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob); // Read the Blob as a Data URL
    });
}

interface LetterboxResult {
    image: cv.Mat; // The padded and resized image
    scale: [number, number]; // Scaling factors for width and height
    pad: [x:number, y:number]; // Padding values for width and height
}

function letterbox(
    im: cv.Mat,
    newShape: [number, number] | number = [640, 640],
    color: [number, number, number] = [114, 114, 114],
    scaleup: boolean = true
): LetterboxResult {
    // Current shape [height, width]
    const shape: [number, number] = [im.rows, im.cols];

    // Convert integer newShape to [newShape, newShape] if needed
    if (typeof newShape === "number") {
        newShape = [newShape, newShape];
    }

    // Calculate the scaling ratio and resize the image
    let r = Math.min(newShape[0] / shape[0], newShape[1] / shape[1]);
    if (!scaleup) {
        r = Math.min(r, 1.0);
    }

    // Calculate new unpadded dimensions and padding
    const newUnpad: [number, number] = [
        Math.round(shape[1] * r),
        Math.round(shape[0] * r),
    ];
    const dw = (newShape[1] - newUnpad[0]) / 2; // divide padding into 2 sides
    const dh = (newShape[0] - newUnpad[1]) / 2;

    // Resize the image to the new unpadded dimensions
    let resized = new cv.Mat();
    if (shape[1] !== newUnpad[0] || shape[0] !== newUnpad[1]) {
        const newSize = new cv.Size(newUnpad[0], newUnpad[1]);
        cv.resize(im, resized, newSize, 0, 0, cv.INTER_LINEAR);
    } else {
        resized = im.clone();
    }    
    if (resized.channels() === 1) {
        cv.cvtColor(resized, resized, cv.COLOR_GRAY2RGB); // Convert grayscale to BGR
    } else if (resized.channels() === 4) {
        cv.cvtColor(resized, resized, cv.COLOR_RGBA2RGB); // Convert RGBA to BGR
    } else {
        // roi.copyTo(matC3); // If already 3 channels, just copy
    }

    // Add padding to maintain the new shape
    const top = Math.round(dh - 0.1);
    const bottom = Math.round(dh + 0.1);
    const left = Math.round(dw - 0.1);
    const right = Math.round(dw + 0.1);

    let padded = new cv.Mat();
    cv.copyMakeBorder(resized, padded, top, bottom, left, right, cv.BORDER_CONSTANT);

    // Clean up intermediate Mats to prevent memory leaks
    resized.delete();

    return {
        image: padded,
        scale: [r, r],
        pad: [dw, dh],
    };
}
export async function downloadMatAsImage(mat:cv.Mat, fileName = "image.jpg", click:boolean=false) {

    if (mat.channels() !== 3) {
        console.error("Mat must have exactly 3 channels (BGR).");
        return;
    }

    // Step 1: Convert BGR to RGBA
    const rgbaMat = new cv.Mat();
    cv.cvtColor(mat, rgbaMat, cv.COLOR_RGB2RGBA); // Convert BGR to RGBA

    // Step 2: Prepare ImageData from Mat
    const width = rgbaMat.cols;
    const height = rgbaMat.rows;
    const imgData = new ImageData(new Uint8ClampedArray(rgbaMat.data), width, height);

    // Step 3: Render on Canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imgData, 0, 0);

    // Step 4: Convert canvas to Blob and download
    canvas.toBlob((blob) => {
        if (blob) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fileName; // Specify the file name
            if(click)
                link.click();
            URL.revokeObjectURL(link.href); // Clean up
        } else {
            console.error("Failed to create Blob from canvas.");
        }
    }, "image/jpg", 100);

    // Cleanup
    rgbaMat.delete(); // Free OpenCV memory
}
/*
* Handle overflow boxes based on maxSize
* @param {Number[4]} box box in [x, y, w, h] format
* @param {Number} maxSize
* @returns non overflow boxes
*/
const overflowBoxes = (box: [x:number,y:number,w:number,h:number], maxSize: number):[x:number,y:number,w:number,h:number] => {
    box[0] = box[0] >= 0 ? box[0] : 0;
    box[1] = box[1] >= 0 ? box[1] : 0;
    box[2] = box[0] + box[2] <= maxSize ? box[2] : maxSize - box[0];
    box[3] = box[1] + box[3] <= maxSize ? box[3] : maxSize - box[1];
    return box;
};

export interface DetectBox {
    file:File,
    label: string,
    index: number,
    probability: number,
    data: any
    bounding: [x: number, y: number, w: number, h: number],
    scaled: [x: number, y: number, w: number, h: number],
    car: Mat | null | Blob,
    box: [x: number, y: number, w: number, h: number]
    mask: any,
    plate: PlateDetection | null
}

export interface PlateDetection {
    box: [x: number, y: number, w: number, h: number],
    probability: number,
    image?: Blob
    state?: State
    stateConfidence?:number
    text?: string
    plateOverride?:string
    textWithUnderscores?: string
    textAvgProb?: number
    textLetterProb?: number[]
    tlc?: boolean
    nypd?: boolean
}