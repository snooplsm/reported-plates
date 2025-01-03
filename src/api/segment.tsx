import { InferenceSession, Tensor, env } from "onnxruntime-web";
import { download } from "../utils/download";
import cv, { Mat } from "@techstark/opencv-js";
import { yoloSegClasses, yoloSegIndexToLabel, yoloSegVehicles } from "../labels";

const models = [
    ['segment', 'yolov8n-seg'],
    ['nms', 'nms-yolov8'],
    ['mask', 'mask-yolov8-seg'],
    ['plate', 'yolo-v9-t-640-license-plates-end2end'],
    ['plate-class', 'reported-plate-class-best'],
    ['ocr', 'global_mobile_vit_v2_ocr']
]

env.wasm.wasmPaths = '/'

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

export const downloadAll = async () => {
    if (downloaded) {
        return
    }
    if (downloading) {
        return downloading
    }
    const promises: Promise<ArrayBuffer>[] = [];
    models.forEach(([type, modelName]) => {
        console.log(`${import.meta.env.BASE_URL}models/${modelName}.onnx`)
        const url = `${import.meta.env.BASE_URL}models/${modelName}.onnx`
        promises.push(download(
            url,
            [type,
                () => { }]
        ))
    })
    console.log("all")
    downloading = Promise.all(promises).then(async result => {
        console.log("downloaded")
        yolo = await InferenceSession.create(result[0]);
        nms = await InferenceSession.create(result[1]);
        plate = await InferenceSession.create(result[3]);
        plateClass = await InferenceSession.create(result[4])
        ocr = await InferenceSession.create(result[5]);
        downloaded = true
        downloading = null
    }).catch(k => {
        console.log("error", k)
    })
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

interface VehicleBoxes {

}

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



export const segment = async (file: File): Promise<VehicleBoxes[]> => {
    const download = await downloadAll()
    const image = new Image()
    image.src = URL.createObjectURL(file);


    image.onload = async () => {
        const modelInputShape = [1, 3, 640, 640];
        const src = cv.imread(image)
        const modelWidth = modelInputShape[2];
        const modelHeight = modelInputShape[3];
        console.log("Image loaded!", src);
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
        URL.revokeObjectURL(image.src);

        const tensor = new Tensor("float32", input.data32F, modelInputShape);
        const config = new Tensor("float32", new Float32Array(
            [
                yoloSegClasses,
                topk,
                iouThreshold,
                scoreThreshold
            ]
        ))

        const { output0, output1 } = await yolo.run({ images: tensor }); // run session and get output layer. out1: detect layer, out2: seg layer

        const { selected } = await nms.run({ detection: output0, config: config }); // perform nms and filter boxes

        const numClass = yoloSegClasses

        let boxes: DetectBox[] = []; // ready to draw boxes

        // looping through output
        for (let idx = 0; idx < selected.dims[1]; idx++) {
            const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]) as Float32Array; // get rows
            let box = data.slice(0, 4); // det boxes
            const scores = data.slice(4, 4 + numClass); // det classes probability scores
            const score = Math.max(...scores); // maximum probability scores
            const label = scores.indexOf(score); // class id of maximum probability scores
            if (!yoloSegVehicles.has(label)) {
                console.log("no label")
                continue
            }
            console.log("has label", yoloSegIndexToLabel[label])
            box = overflowBoxes(
                [
                    box[0] - 0.5 * box[2], // before upscale x
                    box[1] - 0.5 * box[3], // before upscale y
                    box[2], // before upscale w
                    box[3], // before upscale h
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

            const scaled = [
                x * width_scale,
                y * height_scale,
                w * width_scale,
                h * height_scale
            ]
            if(score>=.7) {
                boxes.push({
                    label: yoloSegIndexToLabel[label],
                    index: label,
                    probability: score,
                    data: data,
                    mask: data.slice(4 + numClass),
                    bounding: [x, y, w, h], // upscale box,
                    scaled: scaled,
                    box: box
                }); // update boxes to draw later
            }
        }
        boxes = boxes.sort((a, b) => {
            // Calculate the image center
            const centerX = modelWidth / 2;
            const centerY = modelHeight / 2;
        
            // Calculate the center of bounding box `a`
            const centerAX = (a.bounding[0] + a.bounding[2]) / 2; // x_center
            const centerAY = (a.bounding[1] + a.bounding[3]) / 2; // y_center
        
            // Calculate the center of bounding box `b`
            const centerBX = (b.bounding[0] + b.bounding[2]) / 2; // x_center
            const centerBY = (b.bounding[1] + b.bounding[3]) / 2; // y_center
        
            // Calculate the Euclidean distance of `a` and `b` to the image center
            const distanceA = Math.sqrt(Math.pow(centerAX - centerX, 2) + Math.pow(centerAY - centerY, 2));
            const distanceB = Math.sqrt(Math.pow(centerBX - centerX, 2) + Math.pow(centerBY - centerY, 2));
        
            // Sort by distance (smaller distance comes first)
            return distanceB-distanceA;
        });

        for (const box of boxes) {
            const [x, y, w, h] = box.scaled
            console.log("boudning", box.bounding)
            console.log("scaled", box.scaled)
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
            link.click()
            const matC3 = new cv.Mat(roi.rows, roi.cols, cv.CV_8UC3); // new image matrix
            cv.cvtColor(roi, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR
            const [w1, h1] = divStride(32, matC3.cols, matC3.rows);
            cv.resize(matC3, matC3, new cv.Size(w1, h1))
            const maxSize = Math.max(matC3.rows, matC3.cols)
            const xPad = maxSize - matC3.cols;
            const xRatio = maxSize / matC3.cols;
            const yPad = maxSize - matC3.rows;
            const yRatio = maxSize / matC3.rows;
            const width_scale = roi.cols / modelWidth
            const height_scale = roi.rows / modelHeight
            const matPad = new cv.Mat();
            cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT)
            const input = cv.blobFromImage(matPad,
                1 / 255.0,
                new cv.Size(modelWidth, modelHeight),
                new cv.Scalar(0, 0, 0),
                true,
                false
            )
            matC3.delete()
            matPad.delete()
            const tensor = new Tensor("float32", input.data32F, modelInputShape);
            const { output0: predictions } = await plate.run({
                images: tensor
            })

            for (let i = 0; i < predictions.data.length; i += 7) {
                const x1 = predictions.data[i + 1] as number
                const y1 = predictions.data[i + 2] as number
                const w1 = predictions.data[i + 3] as number
                const h1 = predictions.data[i + 4] as number
                const confidence = predictions.data[i + 6] as number
                const classId = predictions.data[i + 5] as number
                let box1 = [x1, y1, w1, h1]
                // box1 = overflowBoxes(
                //     [
                //         box1[0] - 0.5 * box1[2], // before upscale x
                //         box1[1] - 0.5 * box1[1], // before upscale y
                //         box1[2], // before upscale w
                //         box1[3], // before upscale h
                //     ],
                //     maxSize
                // ); // keep boxes in maxSize range

                const [x2, y2, w2, h2] = overflowBoxes(
                    [
                        Math.floor(box1[0] * xRatio), // upscale left
                        Math.floor(box1[1] * yRatio), // upscale top
                        Math.floor(box1[2] * xRatio), // upscale width
                        Math.floor(box1[3] * yRatio), // upscale height
                    ],
                    maxSize
                ); // upscale boxes
                if (confidence > .2) {
                    let box2: [x: number, y: number, w: number, h: number] = [x2 * width_scale,
                    y2 * height_scale,
                    w2 * width_scale,
                    h2 * height_scale]
                    console.log(box2)
                    // box2 = [
                    //     240, 259, 380, 345
                    // ]
                    console.log(box2)
                    const [x, y, w, h] = box2

                    box.plate = {
                        box: box2,
                        probability: confidence,
                        image: null
                    }

                    console.log("plate within", box2)
                    const [cropX, cropY, cropWidth, cropHeight] = [
                        x, y, w - x, h - y
                    ]
                    const rect = new cv.Rect(cropX, cropY, cropWidth, cropHeight)
                    const thecar = box.car
                    let roid = await blobToMat(box.car as Blob)
                    let roi = roid.roi(rect).clone()
                    roid.delete()
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
                    box.plate.image = blob
                    const url = URL.createObjectURL(blob);

                    // Create a hidden <a> element to trigger the download
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "plate.jpg";

                    // Trigger the download
                    link.click();

                    // Clean up the temporary URL
                    URL.revokeObjectURL(url);
                    console.log(box.plate)

                    const src = await blobToMat(blob)
                    const matC3 = new cv.Mat(src.rows, src.cols, cv.CV_8UC1); // new image matrix
                    cv.cvtColor(src, matC3, cv.COLOR_BGR2GRAY); // RGBA to BGR
                    const [w3, h3] = divStride(32, matC3.cols, matC3.rows);
                    cv.resize(matC3, matC3, new cv.Size(w3, h3))
                    const maxSize = Math.max(matC3.rows, matC3.cols)
                    const xPad = maxSize - matC3.cols;
                    const xRatio = maxSize / matC3.cols;
                    const yPad = maxSize - matC3.rows;
                    const yRatio = maxSize / matC3.rows;
                    const width_scale1 = src.cols / 140
                    const height_scale1 = src.rows / 70
                    const matPad = new cv.Mat();
                    cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT)
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
                    const totalElements = concatenate.data.length;
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
                            const slotData = data.slice(slotStart, slotStart + alphabetLength);

                            // Find the index of the maximum value in this slot
                            const maxIndex = slotData.reduce((maxIdx, value, idx, array) =>
                                value > array[maxIdx] ? idx : maxIdx, 0);

                            const maxValue = Math.max(...slotData); // Get the probability of the max index

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
                    const matC4 = new cv.Mat(src.rows, src.cols, cv.CV_8UC3); // new image matrix
                    cv.cvtColor(src, matC4, cv.COLOR_RGBA2RGB); // RGBA to BGR
                    const [w4, h4] = divStride(32, matC4.cols, matC4.rows);
                    cv.resize(matC4, matC4, new cv.Size(w4, h4))
                    const maxSize2 = Math.max(matC4.rows, matC4.cols)
                    const xPad2 = maxSize2 - matC4.cols;
                    const xRatio2 = maxSize2 / matC4.cols;
                    const yPad2 = maxSize2 - matC4.rows;
                    const yRatio2 = maxSize2 / matC4.rows;
                    const width_scale2 = src.cols / 160
                    const height_scale2 = src.rows / 160
                    const matPad2 = new cv.Mat();
                    cv.copyMakeBorder(matC4, matPad2, 0, yPad2, 0, xPad2, cv.BORDER_CONSTANT)
                    cv.resize(matPad2, matPad2, new cv.Size(160, 160))
                    const input3 = cv.blobFromImage(matPad2,
                        1 / 255.0,
                        new cv.Size(160, 160),
                        new cv.Scalar(0, 0, 0),
                        false,
                        false
                    )
                    //ENDMAGICc\
                    console.log("before run")
                    matPad2.delete()
                    matC4.delete()

                    const config = new Tensor("float32", new Float32Array(
                        [
                            yoloSegClasses,
                            topk,
                            iouThreshold,
                            scoreThreshold
                        ]
                    ))
                    const plateClassTensor = new Tensor("float32", input3.data32F, [1, 3, 160, 160]);
                    const res = await plateClass.run({ images: plateClassTensor });
                    const outputTensor = res["output0"]
                    const data2 = outputTensor.data as Float32Array; // Access the raw data
                    const batchSize2 = outputTensor.dims[0]; // Should be 1 for this case
                    const outputLength = outputTensor.dims[1]; // Should be 7 for this case

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
                    const maxProbability = classProbabilities[maxProbIndex];

                    // Log the decoded results
                    console.log("Bounding Box:");
                    console.log(`  x_center: ${xCenter}, y_center: ${yCenter}`);
                    console.log(`  width: ${width}, height: ${height}`);
                    console.log(`Most likely class index: ${maxProbIndex}`);
                    console.log(`Probability of the class: ${maxProbability}`);

                }
            }
            break;
        }
        if (src) {
            src.delete()
        }
    }


    const success = true; // Simulate a condition
    if (success) {
        return []
    } else {
        throw new Error("Failed to process segment.");
    }
};

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 1): Promise<Blob> {
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
            img.src = reader.result; // Set the Blob as the source
        };

        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob); // Read the Blob as a Data URL
    });
}

/*
* Handle overflow boxes based on maxSize
* @param {Number[4]} box box in [x, y, w, h] format
* @param {Number} maxSize
* @returns non overflow boxes
*/
const overflowBoxes = (box: number[], maxSize: number) => {
    box[0] = box[0] >= 0 ? box[0] : 0;
    box[1] = box[1] >= 0 ? box[1] : 0;
    box[2] = box[0] + box[2] <= maxSize ? box[2] : maxSize - box[0];
    box[3] = box[1] + box[3] <= maxSize ? box[3] : maxSize - box[1];
    return box;
};

export interface DetectBox {
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
    image: Blob | null
}