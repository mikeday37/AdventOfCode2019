'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const common = require('../common.js');

(function(){
    common.day(8, 'Space Image Format',
        828,
        'ZLBJF'
    );
    
    //common.addExtensions();

    common.benchmark((time, doPart) => {
        checkExamples();

        let layers;

        doPart(1, () => {
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

        doPart(2, () => {
            image = parseImage(layers);
            const message = // I don't see a reasonably better way short of knowing the font or using OCR...
                image.join(',') === 'XXXX X    XXX    XX XXXX ,   X X    X  X    X X    ,  X  X    XXX     X XXX  , X   X    X  X    X X    ,X    X    X  X X  X X    ,XXXX XXXX XXX   XX  X    '
                ? 'ZLBJF' : '???';
            return message;
        });

        console.log('[start image]');
        for (let line of image)
            console.log(`\t${line}`);
        console.log('[end image]')
    });
})();

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