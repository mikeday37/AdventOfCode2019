import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { assert } from 'console';
import { resolve } from 'path';
import { createWorker } from 'tesseract.js';
import canvas_pkg from 'canvas';
const { createCanvas } = canvas_pkg;
import { hqx } from 'hqx-node-js';


// image is just an array of strings, where each character is a pixel.  'X' for black, ' ' for white
// before OCR, a 2-pixel white border is added around the original image, then its upscaled 4x via hqx
export async function recognizeImageTextAsync(image)
{
    let canvas = createCanvasFromImage(image);
    saveCanvas(canvas, '-original');
    let finalCanvas = hqx(canvas, 4);
    let physicalImagePath = saveCanvas(finalCanvas, '-final-ocr-input');
    let text = await recognizePhysicalImageTextAsync(physicalImagePath);
    return text.trim();
}

function addBorder(originalImage, value, thickness)
{
    let image = [...originalImage];
    let originalWidth = image[0].length;
    let horizontal = value[0].repeat(originalWidth + 2 * thickness);
    let vertical = value[0].repeat(thickness);
    for (let i = 0; i < image.length; i++)
        image[i] = vertical + image[i] + vertical;
    for (let i = 0; i < thickness; i++)
    {
        image.unshift(horizontal);
        image.push(horizontal);
    }
    return image;
}

export function createCanvasFromImage(rawImage)
{
    let image = addBorder(rawImage, ' ', 2);
    const width = image[0].length;
    const height = image.length;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    let i = 0;
    for (let row of image)
        for (let pixel of row)
        {
            let rgb = pixel === 'X' ? 0 : 255;
            imageData.data[i++] = rgb;
            imageData.data[i++] = rgb;
            imageData.data[i++] = rgb;
            imageData.data[i++] = 255;
        }
    assert(i === imageData.data.length, 'pixel write length mismatch');
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

export function saveCanvas(canvas, suffix = '')
{
    const dir = resolve('temp');
    if (!existsSync(dir))
        mkdirSync(dir);
    const filePath = resolve(dir, `canvas${suffix}.png`);
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(filePath, buffer);
    return filePath;
}

export async function recognizePhysicalImageTextAsync(imagePath)
{
    const worker = createWorker({logger: x => console.log(x)});
    const language = 'eng';
    await worker.load();
    await worker.loadLanguage(language);
    await worker.initialize(language);
    const {data: {text}} = await worker.recognize(imagePath) ;
    await worker.terminate();
    return text;
}
