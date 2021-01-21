'use strict';
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { assert } = require('console');
const path = require('path');
const tesseract = require('tesseract.js')
const { createCanvas } = require('canvas');
const { hqx } = require('hqx-node-js');

exports.recognizeImageTextAsync = recognizeImageTextAsync;

async function recognizeImageTextAsync(image)
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

function createCanvasFromImage(rawImage)
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

function saveCanvas(canvas, suffix = '')
{
    const dir = path.resolve('temp');
    if (!existsSync(dir))
        mkdirSync(dir);
    const filePath = path.resolve(dir, `canvas${suffix}.png`);
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(filePath, buffer);
    return filePath;
}

async function recognizePhysicalImageTextAsync(imagePath)
{
    const worker = tesseract.createWorker({logger: x => console.log(x)});
    const language = 'eng';
    await worker.load();
    await worker.loadLanguage(language);
    await worker.initialize(language);
    const {data: {text}} = await worker.recognize(imagePath) ;
    await worker.terminate();
    return text;
}
