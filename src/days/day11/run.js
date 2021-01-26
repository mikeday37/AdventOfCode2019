'use strict';
const { assert } = require('console');
const { readFileSync } = require('fs');
const { getIntcodeService } = require('../../lib/intcode.js');
const { recognizePhysicalImageTextAsync, createCanvasFromImage, saveCanvas } = require('../../lib/ocr.js');
const { hqx } = require('hqx-node-js');

const manager = require('../../lib/dayManager.js');

(function(){
    manager.dayAsync(11, 'Space Police',
    [
        1909,
        'JUFEKHPH'
    ],
    async (api) =>
    {
        const intcode = api.time('get service', ()=>getIntcodeService());
        const program = api.time('read and parse', ()=>intcode.parse(readFileSync('./input.txt', 'utf-8')));

        let part1Output;
        api.doPart(1, () => {
            part1Output = getRobotOutput(intcode, program);
            return part1Output.paintedPanels.size;
        });
        saveCanvas(createCanvasFromImage(createImageFromOutput(part1Output)), '-part1');

        const part2Output = api.time('part 2: get output', () => getRobotOutput(intcode, program, 1));
        const image = api.time('part 2: create image', () => createImageFromOutput(part2Output));
        const canvas = api.time('part 2: create canvas', () => createCanvasFromImage(image));
        api.time('part 2: save original', () => saveCanvas(canvas, '-original'));
        const finalCanvas = api.time('part 2: upscale', () => hqx(canvas, 4));
        const physicalImagePath = api.time('part 2: save upscaled', () => saveCanvas(finalCanvas, '-final-ocr-input'));
        let part2text;
        await api.timeAsync('part 2: recognize', async () => part2text = (await recognizePhysicalImageTextAsync(physicalImagePath)).trim());
        api.notePart(2, part2text);
    });
})();

function xyToKey(x,y) {return `${x},${y}`;}

function getRobotOutput(intcode, program, initialPanelColor = 0)
{
    let paintedPanels = new Map();
    let x = 0, y = 0, dir = 0;
    let bounds = newBounds();
    let evenOutputIndex = true;
    function posKey() {return xyToKey(x,y);}
    if (initialPanelColor)
        paintedPanels.set(posKey(), 1);
    const dirs = [ [ 0, -1 ], [ 1, 0 ], [ 0, 1 ], [ -1, 0 ] ]; // auto-generated, see commit 
    let state = intcode.init(program, {
        hasInput: () => true,
        readInput: () => paintedPanels.get(posKey()) ?? 0,
        writeOutput: v => {
            if (evenOutputIndex)
                paintedPanels.set(posKey(), v)
            else
            {
                dir = (4 + dir + (v ? 1 : -1)) % 4;
                const [dx, dy] = dirs[dir]; 
                x += dx; y += dy;
                bounds.extend(x, y);
            }
            evenOutputIndex = !evenOutputIndex;
        }
    })
    while (!state.haltCode)
        state.step();
    return {paintedPanels, bounds}
}

function newBounds()
{
    let left, right, top, bottom;
    let bounds = {left, right, top, bottom, extend: (x, y) => {
        if (bounds.left   === undefined || x < bounds.left)   bounds.left   = x;
        if (bounds.right  === undefined || x > bounds.right)  bounds.right  = x;
        if (bounds.top    === undefined || y < bounds.top)    bounds.top    = y;
        if (bounds.bottom === undefined || y > bounds.bottom) bounds.bottom = y;
    }};
    return bounds;
}

function createImageFromOutput(output)
{
    const [left, top] = [output.bounds.left, output.bounds.top]
    const width = 1 + output.bounds.right - left;
    const height = 1 + output.bounds.bottom - top;
    let image = [];
    for (let y = 0; y < height; y++)
    {
        let line = '';
        for (let x = 0; x < width; x++)
            line += (output.paintedPanels.get(xyToKey(x + left, y + top)) ?? 0) ? 'X' : ' ';
        image.push(line);
    }
    return image;
}
