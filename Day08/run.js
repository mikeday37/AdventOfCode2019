'use strict';
const { assert } = require('console');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const path = require('path');
const tesseract = require('tesseract.js')
const { createCanvas } = require('canvas');
const manager = require('../dayManager.js');
const { hqx } = require('hqx-node-js');

(function(){
    manager.dayAsync(8, 'Space Image Format',
    [
        828, 
        'ZLBJF'
    ],
    async (api) =>
    {
        checkExamples();

        let layers;

        api.doPart(1, () => {
            const rawInput = readFileSync('./input.txt', 'utf-8');
            layers = parseLayers(rawInput, 25, 6);
            const layerWithFewest0 = layers
                .map(x => ({layer: x, zeroes: countLayerDigits(x, 0)}))
                .sort((a, b) => a.zeroes - b.zeroes)
                [0].layer;
            const result = countLayerDigits(layerWithFewest0, 1) * countLayerDigits(layerWithFewest0, 2);
            return result;
        });

        let image;

        await api.doPartAsync(2, async () => {
            image = parseImage(layers);
            let message;
            if (api.runFast)
                message = // speedy skip of the OCR
                    image.join(',') === 'XXXX X    XXX    XX XXXX ,   X X    X  X    X X    ,  X  X    XXX     X XXX  , X   X    X  X    X X    ,X    X    X  X X  X X    ,XXXX XXXX XXX   XX  X    '
                    ? 'ZLBJF' : '???';
            else
                message = await recognizeImageTextAsync(image);

            return message;
        });

        console.log('[start image]');
        for (let line of image)
            console.log(`\t${line}`);
        console.log('[end image]')
    });
})();

async function recognizeImageTextAsync(image)
{
    let canvas = createCanvasFromImage(image);
    let finalCanvas = upscaleCanvas(canvas);
    let physicalImagePath = saveCanvas(finalCanvas, '-final-ocr-input');
    let text = await recognizePhysicalImageTextAsync(physicalImagePath);
    return text.trim();
}

function upscaleCanvas(originalCanvas)
{
    return hqx(originalCanvas, 4);
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
    saveCanvas(canvas, '-original');
    let upscaled = canvas;//hqx(canvas, 3);
    return upscaled;
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

function checkExamples()
{
    const check1 = parseLayers('123456789012', 3, 2);
    assert(check1.length === 2, 'part 1 example layer count wrong.');
    assert(check1[0].join(',') === '123,456', 'part 1 example layer 1 mismatch');
    assert(check1[1].join(',') === '789,012', 'part 1 example layer 2 mismatch');

    const check2layers = parseLayers('0222112222120000', 2, 2);
    const check2 = parseImage(check2layers);
    assert(check2.join(',') === ' X,X ');
}

function parseLayers(digits, width, height)
{
    let allLayers = [];
    let layer = [];
    let row = '';
    for (let x of digits)
    {
        row += x;
        if (row.length >= width)
        {
            layer.push(row);
            if (layer.length >= height)
            {
                allLayers.push(layer);
                layer = [];
            }
            row = '';
        }
    }
    return allLayers;
}

function countLayerDigits(layer, digit)
{
    return [...layer.join('')]
        .filter(x => x === String(digit))
        .length;
}

function parseImage(layers)
{
    let firstLayer = layers[0];
    let firstRow = firstLayer[0];
    let image = [];
    for (let row = 0; row < firstLayer.length; row++)
    {
        let imageRow = '';
        for (let col = 0; col < firstRow.length; col++)
        {
            let pixel = '2';
            for (let layer = 0; layer < layers.length && pixel === '2'; layer++)
                pixel = layers[layer][row][col];
            imageRow += (pixel === '1' ? 'X' : ' ');
        }
        image.push(imageRow);
    }
    return image;
}