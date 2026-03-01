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

interface DownloadProgressState {
    text: string
    progress: number
}

const topk = 100;
const iouThreshold = 0.4;
const scoreThreshold = 0.2;

export const downloadAll = async (onProgress?: (progress: DownloadProgressState) => void) => {
    if (downloaded) {
        onProgress?.({
            text: "Models ready",
            progress: 100
        })
        return
    }
    if (downloading) {
        return downloading
    }
    const progressByModel = new Map<string, number>()
    const updateProgress = () => {
        const total = models.length
        const sum = Array.from(progressByModel.values()).reduce((acc, value) => acc + value, 0)
        const progress = total > 0 ? sum / total : 0
        onProgress?.({
            text: "Downloading models...",
            progress: Math.min(95, parseFloat(progress.toFixed(2)))
        })
    }

    const promises: Promise<ArrayBuffer>[] = [];
    models.forEach(([type, modelName]) => {
        progressByModel.set(type, 0)
        const url = `${import.meta.env.BASE_URL}models/${modelName}.onnx`
        promises.push(download(
            url,
            [type,
                ({ progress }) => {
                    progressByModel.set(type, progress)
                    updateProgress()
                }]
        ))
    })
    downloading = (async () => {
        try {
            const result = await Promise.all(promises)
            onProgress?.({
                text: "Initializing models...",
                progress: 97
            })
            yolo = await InferenceSession.create(result[0]);
            nms = await InferenceSession.create(result[1]);
            plate = await InferenceSession.create(result[3]);
            plateClass = await InferenceSession.create(result[4])
            ocr = await InferenceSession.create(result[5]);
            downloaded = true
            onProgress?.({
                text: "Models ready",
                progress: 100
            })
        } catch (error) {
            downloaded = false
            onProgress?.({
                text: "Model load failed",
                progress: 0
            })
            throw error
        } finally {
            downloading = null
        }
    })()
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

const clampRectToMat = (mat: Mat, x1: number, y1: number, x2: number, y2: number): cv.Rect | null => {
    const left = Math.max(0, Math.floor(Math.min(x1, x2)));
    const top = Math.max(0, Math.floor(Math.min(y1, y2)));
    const right = Math.min(mat.cols, Math.ceil(Math.max(x1, x2)));
    const bottom = Math.min(mat.rows, Math.ceil(Math.max(y1, y2)));
    const width = right - left;
    const height = bottom - top;
    if (width <= 2 || height <= 2) {
        return null;
    }
    return new cv.Rect(left, top, width, height);
}

const detectPlateBoxes = async (mat: Mat): Promise<DetectionResult[]> => {
    const letter = letterbox(mat, [640, 640]);
    const tensor = await matToOnnxTensor(letter.image);
    const { output0: predictions } = await plate.run({ images: tensor });
    return convertToDetectionResult(
        predictions.data as Float32Array,
        ['plate', 'fuhghedaboutit'],
        letter.scale,
        letter.pad,
        0.2
    ).sort((a, b) => b.confidence - a.confidence);
}



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
                const link = document.createElement("a");
                link.href = url;
                link.download = "car.jpg";
                URL.revokeObjectURL(url)

                const initialDetections = await detectPlateBoxes(roi)
                const initialBest = initialDetections.find((det) => det.confidence > 0.2)
                if (!initialBest) {
                    roi.delete()
                    continue
                }

                let sourceForDetection = roi
                let chosenDetection = initialBest
                let rotatedCar: Mat | null = null

                const firstRect = clampRectToMat(
                    roi,
                    initialBest.boundingBox.x1,
                    initialBest.boundingBox.y1,
                    initialBest.boundingBox.x2,
                    initialBest.boundingBox.y2
                )

                if (firstRect) {
                    const roughPlate = roi.roi(firstRect).clone()
                    const angle = estimateSkewAngleDeg(roughPlate)
                    roughPlate.delete()

                    if (Math.abs(angle) >= 1) {
                        // estimateSkewAngleDeg returns the observed tilt; rotate full car in the
                        // same corrective direction used by deskewPlateMat for consistency.
                        rotatedCar = rotateMatExpand(roi, angle)
                        const rotatedDetections = await detectPlateBoxes(rotatedCar)
                        const rotatedBest = rotatedDetections.find((det) => det.confidence > 0.2)
                        if (rotatedBest) {
                            sourceForDetection = rotatedCar
                            chosenDetection = rotatedBest
                        } else {
                            rotatedCar.delete()
                            rotatedCar = null
                        }
                    }
                }

                const finalRect = clampRectToMat(
                    sourceForDetection,
                    chosenDetection.boundingBox.x1,
                    chosenDetection.boundingBox.y1,
                    chosenDetection.boundingBox.x2,
                    chosenDetection.boundingBox.y2
                )

                if (finalRect) {
                    const plateCrop = sourceForDetection.roi(finalRect).clone()
                    const parsedPlate = await detectPlate(plateCrop)
                    plateCrop.delete()
                    parsedPlate.box = [finalRect.x, finalRect.y, finalRect.width, finalRect.height]
                    parsedPlate.probability = chosenDetection.confidence
                    box.plate = parsedPlate
                }

                if (rotatedCar) {
                    rotatedCar.delete()
                }
                roi.delete()
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

function deskewPlateMat(source: Mat): Mat {
    const angle = estimateSkewAngleDeg(source)
    if (Math.abs(angle) < 0.2) {
        return source.clone();
    }

    const deskewed = new cv.Mat();
    const center = new cv.Point(source.cols / 2, source.rows / 2);
    const rotation = cv.getRotationMatrix2D(center, -angle, 1.0);
    cv.warpAffine(
        source,
        deskewed,
        rotation,
        new cv.Size(source.cols, source.rows),
        cv.INTER_LINEAR,
        cv.BORDER_REPLICATE
    );
    rotation.delete();
    return deskewed;
}

function estimateSkewAngleDeg(source: Mat): number {
    const gray = new cv.Mat();
    if (source.channels() === 4) {
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    } else if (source.channels() === 3) {
        cv.cvtColor(source, gray, cv.COLOR_BGR2GRAY);
    } else {
        source.copyTo(gray);
    }

    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0);

    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 40, 120, 3, false);

    const lines = new cv.Mat();
    cv.HoughLinesP(
        edges,
        lines,
        1,
        Math.PI / 180,
        20,
        Math.max(16, Math.floor(source.cols * 0.25)),
        Math.max(8, Math.floor(source.cols * 0.05))
    );

    let weightedAngle = 0;
    let totalWeight = 0;
    if (lines.rows > 0) {
        for (let i = 0; i < lines.rows; i++) {
            const x1 = lines.data32S[i * 4];
            const y1 = lines.data32S[i * 4 + 1];
            const x2 = lines.data32S[i * 4 + 2];
            const y2 = lines.data32S[i * 4 + 3];

            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.hypot(dx, dy);
            if (length < 10) {
                continue;
            }

            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            while (angle > 90) angle -= 180;
            while (angle < -90) angle += 180;
            if (Math.abs(angle) > 45) {
                continue;
            }

            weightedAngle += angle * length;
            totalWeight += length;
        }
    }

    lines.delete();
    edges.delete();
    blurred.delete();
    gray.delete();
    return totalWeight > 0 ? (weightedAngle / totalWeight) : 0;
}

function rotateMatExpand(source: Mat, angleDeg: number): Mat {
    const radians = angleDeg * Math.PI / 180;
    const absCos = Math.abs(Math.cos(radians));
    const absSin = Math.abs(Math.sin(radians));
    const boundW = Math.ceil(source.rows * absSin + source.cols * absCos);
    const boundH = Math.ceil(source.rows * absCos + source.cols * absSin);

    const center = new cv.Point(source.cols / 2, source.rows / 2);
    const rotation = cv.getRotationMatrix2D(center, angleDeg, 1.0);
    rotation.data64F[2] += (boundW / 2) - center.x;
    rotation.data64F[5] += (boundH / 2) - center.y;

    const rotated = new cv.Mat();
    cv.warpAffine(
        source,
        rotated,
        rotation,
        new cv.Size(boundW, boundH),
        cv.INTER_LINEAR,
        cv.BORDER_REPLICATE
    );
    rotation.delete();
    return rotated;
}

export async function detectPlate(matC3:Mat): Promise<PlateDetection> {
    await downloadAll(()=>{})
    const deskewed = deskewPlateMat(matC3)
    const matC4 = deskewed.clone()
    const matPad = deskewed.clone()
    if (matPad.channels() === 4) {
        cv.cvtColor(matPad, matPad, cv.COLOR_RGBA2GRAY);
    } else {
        cv.cvtColor(matPad, matPad, cv.COLOR_BGR2GRAY);
    }
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

    // Class probabilities start from index 4
    const classProbabilities = data2.slice(4);

    // Get the most likely class index and probability
    const maxProbIndex = classProbabilities.reduce(
        (maxIdx, value, idx, array) => (value > array[maxIdx] ? idx : maxIdx),
        0
    );
    const label = maxProbIndex + 4
    const maxProbability = classProbabilities[maxProbIndex];

    
    const plateProb = platesWithProbabilities[0] || null
    const plate = {} as PlateDetection
    plate.text = plateProb.plate.split("").filter(x=>x!=='_').join("")
    plate.textWithUnderscores = plateProb.plate
    plate.textAvgProb = plateProb.averageProbability
    plate.textLetterProb = plateProb.probabilities
    plate.state = yoloClassIndexToLabel[label].split("_")[0] as State
    plate.tlc = yoloClassIndexToLabel[label].endsWith("_TLC")
    plate.nypd = yoloClassIndexToLabel[label].endsWith("_PD")
    plate.stateConfidence = maxProbability
    plate.image = await matToBlob(deskewed)
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
    deskewed.delete()
    matC4.delete()
    return plate
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
